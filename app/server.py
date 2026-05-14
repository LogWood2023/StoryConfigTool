from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import pandas as pd
import re
import os

app = FastAPI()

DATA_DIR = None


class FolderRequest(BaseModel):
    path: str


def find_header_and_data_start(df, key_field: str):
    header_row = None
    for i in range(min(10, len(df))):
        row_values = [str(v).strip().lower() for v in df.iloc[i].tolist() if pd.notna(v)]
        if key_field.lower() in row_values:
            header_row = i
            break

    if header_row is None:
        return None, None, None

    headers = df.iloc[header_row].tolist()
    col_map = {}
    for idx, h in enumerate(headers):
        h_str = str(h).strip() if pd.notna(h) else ""
        if h_str:
            col_map[h_str.lower()] = idx

    id_col = col_map.get(key_field.lower())
    if id_col is None:
        return header_row, col_map, header_row + 1

    data_start = header_row + 1
    for i in range(header_row + 1, min(header_row + 5, len(df))):
        cell = str(df.iloc[i, id_col]).strip().lower() if pd.notna(df.iloc[i, id_col]) else ""
        if cell in ("int", "string", "int[]", "int[][]", "string[]", "string[][]", "float"):
            data_start = i + 1
            continue
        if cell in ("key", "index", "key,set", "set", ""):
            data_start = i + 1
            continue
        first_val = df.iloc[i, id_col]
        if pd.notna(first_val):
            try:
                int(float(str(first_val)))
                data_start = i
                break
            except (ValueError, TypeError):
                data_start = i + 1

    return header_row, col_map, data_start


def parse_trigger_condition(raw_value) -> list[dict]:
    if pd.isna(raw_value):
        return []
    text = str(raw_value).strip()
    if not text or text == "nan":
        return []

    conditions = []
    groups = re.split(r'[;；]', text)
    for group in groups:
        group = group.strip().strip('()')
        if not group:
            continue
        parts = re.split(r'[,，]', group)
        if len(parts) >= 1:
            try:
                cond_id = int(float(parts[0].strip()))
                min_val = int(float(parts[1].strip())) if len(parts) > 1 else None
                max_val = int(float(parts[2].strip())) if len(parts) > 2 else None
                format_error = len(parts) < 2
                conditions.append({"id": cond_id, "min": min_val, "max": max_val, "formatError": format_error})
            except (ValueError, TypeError):
                conditions.append({"id": None, "min": None, "max": None, "formatError": True})
    return conditions


def read_conditions(folder_path: str) -> dict:
    file_path = os.path.join(folder_path, "Condition.xlsx")
    if not os.path.exists(file_path):
        return {}

    try:
        df = pd.read_excel(file_path, sheet_name="condition", header=None)
    except Exception:
        df = pd.read_excel(file_path, sheet_name=0, header=None)

    _, col_map, data_start = find_header_and_data_start(df, "Id")
    if col_map is None:
        return {}

    id_col = col_map.get("id")
    name_col = col_map.get("name")
    condition_col = col_map.get("condition")
    if id_col is None or name_col is None:
        return {}

    result = {}
    for i in range(data_start, len(df)):
        raw_id = df.iloc[i, id_col]
        if pd.isna(raw_id):
            continue
        try:
            cid = int(float(str(raw_id)))
        except (ValueError, TypeError):
            continue
        raw_name = df.iloc[i, name_col]
        name = str(raw_name).strip() if pd.notna(raw_name) else f"条件{cid}"
        if not name or name == "nan":
            name = f"条件{cid}"
        cond_type = None
        if condition_col is not None:
            raw_type = df.iloc[i, condition_col]
            if pd.notna(raw_type):
                try:
                    cond_type = int(float(str(raw_type)))
                except (ValueError, TypeError):
                    pass
        result[cid] = {"name": name, "condType": cond_type}

    return result


def read_story_groups(folder_path: str) -> list[dict]:
    file_path = os.path.join(folder_path, "StoryGroup.xlsx")
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"StoryGroup.xlsx not found in {folder_path}")

    df = pd.read_excel(file_path, sheet_name="Sheet1", header=None)

    _, col_map, data_start = find_header_and_data_start(df, "StoryGroupId")
    if col_map is None:
        raise ValueError("Cannot find header row with StoryGroupId column")

    id_col = col_map.get("storygroupid")
    name_col = col_map.get("name")
    trigger_col = col_map.get("triggercondition")
    selfadd_col = col_map.get("selfaddcondition")

    if id_col is None or name_col is None:
        raise ValueError("StoryGroupId or Name column not found")

    condition_map = read_conditions(folder_path)

    results = []
    for i in range(data_start, len(df)):
        raw_id = df.iloc[i, id_col]
        raw_name = df.iloc[i, name_col]

        if pd.isna(raw_id):
            continue

        try:
            story_id = int(float(str(raw_id)))
        except (ValueError, TypeError):
            continue

        name = str(raw_name).strip() if pd.notna(raw_name) else ""
        if not name or name == "nan":
            name = f"(unnamed-{story_id})"

        trigger_conditions = []
        if trigger_col is not None:
            raw_trigger = df.iloc[i, trigger_col]
            parsed = parse_trigger_condition(raw_trigger)
            for cond in parsed:
                if cond["id"] is None:
                    trigger_conditions.append({
                        "id": None,
                        "name": "格式错误",
                        "min": None,
                        "max": None,
                        "formatError": True
                    })
                else:
                    cond_info = condition_map.get(cond["id"], {"name": f"条件{cond['id']}", "condType": None})
                    trigger_conditions.append({
                        "id": cond["id"],
                        "name": cond_info["name"],
                        "min": cond["min"],
                        "max": cond["max"],
                        "formatError": cond["formatError"]
                    })

        self_add_conditions = []
        if selfadd_col is not None:
            raw_selfadd = df.iloc[i, selfadd_col]
            if pd.notna(raw_selfadd):
                text = str(raw_selfadd).strip()
                if text and text != "nan":
                    parts = re.split(r'[,，;；\s]+', text)
                    for p in parts:
                        p = p.strip().strip('()')
                        if p:
                            try:
                                sa_id = int(float(p))
                                cond_info = condition_map.get(sa_id, {"name": f"条件{sa_id}", "condType": None})
                                self_add_conditions.append({
                                    "id": sa_id,
                                    "name": cond_info["name"],
                                    "condType": cond_info["condType"]
                                })
                            except (ValueError, TypeError):
                                pass

        results.append({
            "id": story_id,
            "name": name,
            "conditions": trigger_conditions,
            "selfAddConditions": self_add_conditions
        })

    return results


def lookup_table(folder_path: str, filename: str, sheet_name, id_field: str) -> dict:
    file_path = os.path.join(folder_path, filename)
    if not os.path.exists(file_path):
        return {}

    try:
        df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
    except Exception:
        df = pd.read_excel(file_path, sheet_name=0, header=None)

    _, col_map, data_start = find_header_and_data_start(df, id_field)
    if col_map is None:
        return {}

    id_col = col_map.get(id_field.lower())
    name_col = col_map.get("name")
    if id_col is None or name_col is None:
        return {}

    result = {}
    for i in range(data_start, len(df)):
        raw_id = df.iloc[i, id_col]
        if pd.isna(raw_id):
            continue
        try:
            rid = int(float(str(raw_id)))
        except (ValueError, TypeError):
            continue
        raw_name = df.iloc[i, name_col]
        name = str(raw_name).strip() if pd.notna(raw_name) else ""
        result[rid] = name

    return result


def read_condition_detail(folder_path: str, condition_id: int) -> dict | None:
    file_path = os.path.join(folder_path, "Condition.xlsx")
    if not os.path.exists(file_path):
        return None

    try:
        df = pd.read_excel(file_path, sheet_name="condition", header=None)
    except Exception:
        df = pd.read_excel(file_path, sheet_name=0, header=None)

    _, col_map, data_start = find_header_and_data_start(df, "Id")
    if col_map is None:
        return None

    id_col = col_map.get("id")
    name_col = col_map.get("name")
    condition_col = col_map.get("condition")
    params_col = col_map.get("conditionparams")
    datatype_col = col_map.get("datatype")

    if id_col is None:
        return None

    target_row = None
    for i in range(data_start, len(df)):
        raw_id = df.iloc[i, id_col]
        if pd.isna(raw_id):
            continue
        try:
            cid = int(float(str(raw_id)))
        except (ValueError, TypeError):
            continue
        if cid == condition_id:
            target_row = i
            break

    if target_row is None:
        return None

    def get_int(col_idx):
        if col_idx is None:
            return None
        val = df.iloc[target_row, col_idx]
        if pd.isna(val):
            return None
        try:
            return int(float(str(val)))
        except (ValueError, TypeError):
            return None

    def get_str(col_idx):
        if col_idx is None:
            return ""
        val = df.iloc[target_row, col_idx]
        if pd.isna(val):
            return ""
        return str(val).strip()

    def get_int_list(col_idx):
        if col_idx is None:
            return []
        val = df.iloc[target_row, col_idx]
        if pd.isna(val):
            return []
        text = str(val).strip()
        if not text or text == "nan":
            return []
        parts = re.split(r'[,，;；\s]+', text)
        result = []
        for p in parts:
            p = p.strip().strip('()')
            if p:
                try:
                    result.append(int(float(p)))
                except (ValueError, TypeError):
                    pass
        return result

    cond_id = condition_id
    cond_name = get_str(name_col) or f"条件{cond_id}"
    cond_type = get_int(condition_col)
    cond_params = get_int_list(params_col)
    data_type = get_int(datatype_col)

    detail = {
        "id": cond_id,
        "name": cond_name,
        "type": cond_type,
        "params": cond_params,
        "dataType": data_type,
        "refs": []
    }

    if cond_type == 7 and cond_params:
        task_map = lookup_table(folder_path, "Task.xlsx", "Sheet1", "Id")
        for pid in cond_params:
            detail["refs"].append({
                "table": "Task",
                "id": pid,
                "name": task_map.get(pid, f"任务{pid}")
            })

    elif cond_type == 8 and cond_params:
        equip_map = lookup_table(folder_path, "EquipBase.xlsx", "装备基底", "ID")
        for pid in cond_params:
            detail["refs"].append({
                "table": "EquipBase",
                "id": pid,
                "name": equip_map.get(pid, f"装备{pid}")
            })

    elif cond_type == 9 and cond_params:
        item_map = lookup_table(folder_path, "Item.xlsx", "item", "Id")
        for pid in cond_params:
            detail["refs"].append({
                "table": "Item",
                "id": pid,
                "name": item_map.get(pid, f"道具{pid}")
            })

    elif cond_type == 10 and cond_params:
        stage_map = lookup_table(folder_path, "Stage.xlsx", "stage", "StageId")
        if len(cond_params) >= 3 and cond_params[0] == 12:
            low = cond_params[1]
            high = cond_params[2]
            for sid in range(low, high + 1):
                detail["refs"].append({
                    "table": "Stage",
                    "id": sid,
                    "name": stage_map.get(sid, f"关卡{sid}")
                })
        else:
            for pid in cond_params:
                detail["refs"].append({
                    "table": "Stage",
                    "id": pid,
                    "name": stage_map.get(pid, f"关卡{pid}")
                })

    elif cond_type == 13 and cond_params:
        cond_map = read_conditions(folder_path)
        for pid in cond_params[:2]:
            cond_info = cond_map.get(pid, {"name": f"条件{pid}", "condType": None})
            detail["refs"].append({
                "table": "Condition",
                "id": pid,
                "name": cond_info["name"]
            })

    elif cond_type == 14 and cond_params:
        talent_map = lookup_table(folder_path, "Talent.xlsx", "Sheet1", "TalentId")
        for pid in cond_params:
            detail["refs"].append({
                "table": "Talent",
                "id": pid,
                "name": talent_map.get(pid, f"天赋{pid}")
            })

    return detail


def lookup_table_multi(folder_path: str, filename: str, sheet_name, id_field: str, fields: list[str]) -> dict:
    file_path = os.path.join(folder_path, filename)
    if not os.path.exists(file_path):
        return {}

    try:
        df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
    except Exception:
        df = pd.read_excel(file_path, sheet_name=0, header=None)

    _, col_map, data_start = find_header_and_data_start(df, id_field)
    if col_map is None:
        return {}

    id_col = col_map.get(id_field.lower())
    if id_col is None:
        return {}

    field_cols = {}
    for f in fields:
        fc = col_map.get(f.lower())
        if fc is not None:
            field_cols[f.lower()] = fc

    result = {}
    for i in range(data_start, len(df)):
        raw_id = df.iloc[i, id_col]
        if pd.isna(raw_id):
            continue
        try:
            rid = int(float(str(raw_id)))
        except (ValueError, TypeError):
            continue
        row_data = {}
        for f_lower, fc in field_cols.items():
            val = df.iloc[i, fc]
            if pd.isna(val):
                row_data[f_lower] = None
            else:
                row_data[f_lower] = str(val).strip()
        result[rid] = row_data

    return result


def lookup_map_events(folder_path: str) -> tuple[dict, dict]:
    file_path = os.path.join(folder_path, "MapEvent.xlsx")
    if not os.path.exists(file_path):
        return {}, {}

    try:
        df = pd.read_excel(file_path, sheet_name="Sheet1", header=None)
    except Exception:
        df = pd.read_excel(file_path, sheet_name=0, header=None)

    _, col_map, data_start = find_header_and_data_start(df, "Id")
    if col_map is None:
        return {}, {}

    id_col = col_map.get("id")
    desc_col = col_map.get("desc1")
    mapid_col = col_map.get("mapid")
    pos_col = col_map.get("position")
    eventid_col = col_map.get("eventid")

    by_id = {}
    by_pos = {}

    for i in range(data_start, len(df)):
        raw_id = df.iloc[i, id_col] if id_col is not None else None
        if raw_id is not None and not pd.isna(raw_id):
            try:
                eid = int(float(str(raw_id)))
            except (ValueError, TypeError):
                continue
        else:
            continue

        desc = ""
        if desc_col is not None:
            raw_desc = df.iloc[i, desc_col]
            desc = str(raw_desc).strip() if pd.notna(raw_desc) else ""

        map_id = None
        if mapid_col is not None:
            raw_map = df.iloc[i, mapid_col]
            if pd.notna(raw_map):
                try:
                    map_id = int(float(str(raw_map)))
                except (ValueError, TypeError):
                    pass

        position = ""
        if pos_col is not None:
            raw_pos = df.iloc[i, pos_col]
            position = str(raw_pos).strip() if pd.notna(raw_pos) else ""

        event_id = None
        if eventid_col is not None:
            raw_eid = df.iloc[i, eventid_col]
            if pd.notna(raw_eid):
                try:
                    event_id = int(float(str(raw_eid)))
                except (ValueError, TypeError):
                    pass

        by_id[eid] = {"id": eid, "desc": desc, "mapId": map_id, "position": position, "eventId": event_id}

        if map_id is not None and position:
            norm_pos = ",".join([str(int(float(p.strip()))) for p in position.split(",") if p.strip()])
            key = f"{map_id},{norm_pos}"
            by_pos[key] = {"id": eid, "desc": desc, "eventId": event_id or eid}

    return by_id, by_pos


def read_task_detail(folder_path: str, task_id: int) -> dict | None:
    file_path = os.path.join(folder_path, "Task.xlsx")
    if not os.path.exists(file_path):
        return None

    try:
        df = pd.read_excel(file_path, sheet_name="Sheet1", header=None)
    except Exception:
        df = pd.read_excel(file_path, sheet_name=0, header=None)

    _, col_map, data_start = find_header_and_data_start(df, "Id")
    if col_map is None:
        return None

    id_col = col_map.get("id")
    if id_col is None:
        return None

    target_row = None
    all_ids = []
    for i in range(data_start, len(df)):
        raw_id = df.iloc[i, id_col]
        if pd.isna(raw_id):
            continue
        try:
            tid = int(float(str(raw_id)))
        except (ValueError, TypeError):
            continue
        all_ids.append(tid)
        if tid == task_id:
            target_row = i

    if target_row is None:
        return None

    duplicate_ids = [x for x in all_ids if all_ids.count(x) > 1]

    def get_val(field_name):
        fc = col_map.get(field_name.lower())
        if fc is None:
            return None
        val = df.iloc[target_row, fc]
        if pd.isna(val):
            return None
        return str(val).strip()

    def get_int_val(field_name):
        v = get_val(field_name)
        if v is None or v == "" or v == "nan":
            return None
        try:
            return int(float(v))
        except (ValueError, TypeError):
            return None

    condition_map = read_conditions(folder_path)
    item_map = lookup_table(folder_path, "Item.xlsx", "item", "Id")
    task_map = lookup_table(folder_path, "Task.xlsx", "Sheet1", "Id")
    story_map = lookup_table(folder_path, "Story.xlsx", "Sheet1", "Id")
    task_group_map = lookup_table(folder_path, "TaskGroup.xlsx", "Sheet1", "TaskGroupId")
    realm_level_map = lookup_table(folder_path, "RealmL_Level.xlsx", "Sheet1", "Level")
    map_events_by_id, map_events_by_pos = lookup_map_events(folder_path)

    def parse_condition_field(raw):
        if raw is None or raw == "" or raw == "nan":
            return []
        return parse_trigger_condition(raw)

    def resolve_conditions(raw):
        parsed = parse_condition_field(raw)
        result = []
        for c in parsed:
            if c["id"] is None:
                result.append({"id": None, "name": "格式错误", "min": None, "max": None, "formatError": True})
            else:
                cond_info = condition_map.get(c["id"], {"name": f"条件{c['id']}", "condType": None})
                result.append({"id": c["id"], "name": cond_info["name"], "min": c["min"], "max": c["max"], "formatError": c["formatError"]})
        return result

    def parse_trigger_field(raw):
        if raw is None or raw == "" or raw == "nan":
            return []
        groups = raw.split(";")
        result = []
        for g in groups:
            g = g.strip()
            if not g:
                continue
            parts = g.split(",")
            if not parts:
                continue
            try:
                trigger_type = int(float(parts[0].strip()))
            except (ValueError, TypeError):
                continue

            if trigger_type == 1:
                item_id = int(float(parts[1].strip())) if len(parts) > 1 else None
                count = int(float(parts[2].strip())) if len(parts) > 2 else 0
                item_name = item_map.get(item_id, f"道具{item_id}") if item_id else "未知"
                result.append({"type": 1, "itemId": item_id, "itemName": item_name, "count": count})

            elif trigger_type == 2:
                story_id = int(float(parts[1].strip())) if len(parts) > 1 else None
                story_name = story_map.get(story_id, f"剧情{story_id}") if story_id else "未知"
                result.append({"type": 2, "storyId": story_id, "storyName": story_name, "isStoryTriggerPoint": True})

            elif trigger_type == 3:
                event_id = int(float(parts[1].strip())) if len(parts) > 1 else None
                event_range = parts[2].strip() if len(parts) > 2 else "0"
                event_info = map_events_by_id.get(event_id, {})
                event_name = event_info.get("desc", f"事件{event_id}") if event_id else "未知"
                result.append({"type": 3, "eventId": event_id, "eventName": event_name, "eventRange": event_range})

            elif trigger_type == 4:
                modify_val = parts[1].strip() if len(parts) > 1 else "0"
                cond_ids = []
                for p in parts[2:]:
                    try:
                        cond_ids.append(int(float(p.strip())))
                    except (ValueError, TypeError):
                        pass
                conditions = []
                for cid in cond_ids:
                    cond_info = condition_map.get(cid, {"name": f"条件{cid}", "condType": None})
                    conditions.append({"id": cid, "name": cond_info["name"]})
                result.append({"type": 4, "condNum": modify_val, "conditions": conditions})

            else:
                result.append({"type": trigger_type, "raw": g})

        return result

    def parse_reward_field(raw):
        if raw is None or raw == "" or raw == "nan":
            return []
        groups = raw.split(";")
        result = []
        for g in groups:
            g = g.strip()
            if not g:
                continue
            parts = g.split(",")
            if len(parts) >= 2:
                try:
                    item_id = int(float(parts[0].strip()))
                    count = int(float(parts[1].strip()))
                    item_name = item_map.get(item_id, f"道具{item_id}")
                    result.append({"itemId": item_id, "name": item_name, "count": count})
                except (ValueError, TypeError):
                    pass
        return result

    def parse_remove_item_field(raw):
        if raw is None or raw == "" or raw == "nan":
            return []
        parts = raw.split(",")
        if len(parts) >= 2:
            try:
                item_id = int(float(parts[0].strip()))
                count = int(float(parts[1].strip()))
                item_name = item_map.get(item_id, f"道具{item_id}")
                return [{"itemId": item_id, "name": item_name, "count": count}]
            except (ValueError, TypeError):
                pass
        return []

    def parse_self_add_condition_field(raw):
        if raw is None or raw == "" or raw == "nan":
            return []
        groups = raw.split(";")
        result = []
        for g in groups:
            g = g.strip()
            if not g:
                continue
            parts = g.split(",")
            if len(parts) >= 2:
                try:
                    cid = int(float(parts[0].strip()))
                    val = int(float(parts[1].strip()))
                    cond_info = condition_map.get(cid, {"name": f"条件{cid}", "condType": None})
                    result.append({"id": cid, "name": cond_info["name"], "value": val})
                except (ValueError, TypeError):
                    pass
        return result

    def parse_track_field(raw):
        if raw is None or raw == "" or raw == "nan" or raw == "0":
            return None
        parts = raw.split(",")
        if len(parts) >= 3:
            try:
                map_id = int(float(parts[0].strip()))
                x = int(float(parts[1].strip()))
                y = int(float(parts[2].strip()))
                pos_key = f"{map_id},{x},{y}"
                event_info = map_events_by_pos.get(pos_key)
                if event_info:
                    return {
                        "found": True,
                        "eventId": event_info["eventId"],
                        "eventName": event_info["desc"],
                        "mapId": map_id,
                        "x": x,
                        "y": y
                    }
                else:
                    return {"found": False, "mapId": map_id, "x": x, "y": y}
            except (ValueError, TypeError):
                return {"found": False, "raw": raw}
        return None

    task_type = get_int_val("Type")
    sub_type = get_int_val("SubType")
    group_raw = get_val("Group")
    group_info = None
    if task_type in (3, 4) and group_raw and group_raw != "nan":
        parts = group_raw.split(",")
        if len(parts) >= 2:
            try:
                gid = int(float(parts[0].strip()))
                weight = int(float(parts[1].strip()))
                gname = task_group_map.get(gid, f"分组{gid}")
                group_info = {"id": gid, "name": gname, "weight": weight}
            except (ValueError, TypeError):
                group_info = {"id": None, "name": "格式错误", "weight": None}

    realm_level_raw = get_int_val("RealmLevel")
    realm_level_info = None
    if task_type in (3, 4) and realm_level_raw is not None:
        rname = realm_level_map.get(realm_level_raw, f"等级{realm_level_raw}")
        realm_level_info = {"level": realm_level_raw, "name": rname}

    next_task_raw = get_int_val("NextTask")
    next_task_info = None
    if next_task_raw is not None:
        next_task_name = task_map.get(next_task_raw, f"任务{next_task_raw}")
        next_task_info = {"id": next_task_raw, "name": next_task_name}

    result = {
        "id": task_id,
        "name": get_val("Name") or f"任务{task_id}",
        "dsc": get_val("Dsc") or "",
        "type": task_type,
        "subType": sub_type,
        "group": group_info,
        "realmLevel": realm_level_info,
        "difficulty": get_int_val("Difficulty"),
        "countdown": get_int_val("Countdown"),
        "acceptCondition": resolve_conditions(get_val("AcceptCondition")),
        "isRepeat": get_int_val("IsRepeat"),
        "isHide": get_int_val("IsHide"),
        "acceptTrigger": parse_trigger_field(get_val("AcceptTrigger")),
        "allowDirectReturn": get_int_val("AllowDirectReturn"),
        "deleteTrigger": parse_trigger_field(get_val("DeleteTrigger")),
        "failTrigger": parse_trigger_field(get_val("FailTrigger")),
        "completeCondition": resolve_conditions(get_val("CompleteCondition")),
        "removeItem": parse_remove_item_field(get_val("RemoveItem")),
        "reward": parse_reward_field(get_val("Reward")),
        "addFavor": get_int_val("AddFavor"),
        "nextTask": next_task_info,
        "selfAddCondition": parse_self_add_condition_field(get_val("SelfAddCondition")),
        "inProgressTrack": parse_track_field(get_val("InProgressTrack")),
        "completeTrack": parse_track_field(get_val("CompleteTrack")),
        "isDuplicate": task_id in duplicate_ids,
        "taskType": task_type
    }

    return result


def get_task_group_options(folder_path: str) -> list:
    tg_map = lookup_table(folder_path, "TaskGroup.xlsx", "Sheet1", "TaskGroupId")
    return [{"id": k, "name": v} for k, v in tg_map.items()]


def get_realm_level_options(folder_path: str) -> list:
    rl_map = lookup_table(folder_path, "RealmL_Level.xlsx", "Sheet1", "Level")
    return [{"id": k, "name": v} for k, v in rl_map.items()]


@app.post("/api/set-folder")
async def set_folder(req: FolderRequest):
    global DATA_DIR
    folder = req.path.strip()
    if not os.path.isdir(folder):
        raise HTTPException(status_code=400, detail=f"Folder not found: {folder}")
    story_file = os.path.join(folder, "StoryGroup.xlsx")
    if not os.path.exists(story_file):
        raise HTTPException(status_code=400, detail="StoryGroup.xlsx not found in the specified folder")
    DATA_DIR = folder
    return {"status": "ok", "path": DATA_DIR}


@app.get("/api/story-groups")
async def get_story_groups():
    if DATA_DIR is None:
        raise HTTPException(status_code=400, detail="No folder configured. Use /api/set-folder first.")
    try:
        groups = read_story_groups(DATA_DIR)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"groups": groups}


@app.get("/api/condition/{condition_id}")
async def get_condition_detail(condition_id: int):
    if DATA_DIR is None:
        raise HTTPException(status_code=400, detail="No folder configured.")
    detail = read_condition_detail(DATA_DIR, condition_id)
    if detail is None:
        raise HTTPException(status_code=404, detail=f"Condition {condition_id} not found")
    return detail


@app.get("/api/task/{task_id}")
async def get_task_detail(task_id: int):
    if DATA_DIR is None:
        raise HTTPException(status_code=400, detail="No folder configured.")
    detail = read_task_detail(DATA_DIR, task_id)
    if detail is None:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    return detail


@app.get("/api/task-list")
async def get_task_list():
    if DATA_DIR is None:
        raise HTTPException(status_code=400, detail="No folder configured.")
    file_path = os.path.join(DATA_DIR, "Task.xlsx")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Task.xlsx not found")
    df = pd.read_excel(file_path, sheet_name="Sheet1", header=None)
    _, col_map, data_start = find_header_and_data_start(df, "Id")
    if col_map is None:
        return []
    id_col = col_map.get("id")
    name_col = col_map.get("name")
    if id_col is None:
        return []
    result = []
    for i in range(data_start, len(df)):
        raw_id = df.iloc[i, id_col]
        if pd.isna(raw_id):
            continue
        try:
            tid = int(float(str(raw_id)))
        except (ValueError, TypeError):
            continue
        name = ""
        if name_col is not None:
            raw_name = df.iloc[i, name_col]
            if pd.notna(raw_name):
                name = str(raw_name).strip()
                if name == "nan":
                    name = ""
        result.append({"id": tid, "name": name or f"任务{tid}"})
    return result


@app.get("/api/task-group-options")
async def get_task_group_opts():
    if DATA_DIR is None:
        raise HTTPException(status_code=400, detail="No folder configured.")
    return get_task_group_options(DATA_DIR)


@app.get("/api/realm-level-options")
async def get_realm_level_opts():
    if DATA_DIR is None:
        raise HTTPException(status_code=400, detail="No folder configured.")
    return get_realm_level_options(DATA_DIR)


static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/")
async def index():
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Story Config Tool API is running"}
