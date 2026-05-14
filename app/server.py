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
                conditions.append({"id": cond_id, "min": min_val, "max": max_val})
            except (ValueError, TypeError):
                continue
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
        result[cid] = name

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
                cond_name = condition_map.get(cond["id"], f"条件{cond['id']}")
                trigger_conditions.append({
                    "id": cond["id"],
                    "name": cond_name,
                    "min": cond["min"],
                    "max": cond["max"]
                })

        results.append({"id": story_id, "name": name, "conditions": trigger_conditions})

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
            detail["refs"].append({
                "table": "Condition",
                "id": pid,
                "name": cond_map.get(pid, f"条件{pid}")
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


static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/")
async def index():
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Story Config Tool API is running"}
