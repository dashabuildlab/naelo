from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Tuple

from fastapi import APIRouter, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse

from app.admin.repo import get_project, get_client
from app.admin.ui.web import page_html
from .common import require_user, get_project_or_404

router = APIRouter()


def _esc(s: str) -> str:
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def _base_dir() -> Path:
    return Path("/srv/python-core/app")


def _client_code_from_project(project_code: str) -> Tuple[str, str]:
    proj = get_project(project_code)
    if not proj:
        return "", "Проєкт не знайдено."

    cid = int(proj.get("client_id") or 0)
    if cid <= 0:
        return "", "У проєкта немає client_id."

    c = get_client(cid)
    if not c:
        return "", "Клієнта не знайдено."

    ccode = (c.get("code") or "").strip()
    if not ccode:
        return "", "У клієнта відсутній code (папка C...)."
    return ccode, ""


def _project_root(client_code: str, project_code: str) -> Path:
    return _base_dir() / "clients" / client_code / "projects" / project_code


def _state_dir(client_code: str, project_code: str) -> Path:
    p = _project_root(client_code, project_code) / "state"
    p.mkdir(parents=True, exist_ok=True)
    return p


def _env_file(sdir: Path) -> Path:
    return sdir / "env.txt"


def _now_iso() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


def _default_env_text() -> str:
    return (
        "# ENV проєкту (локальний .env)\n"
        "# Формат: KEY=VALUE, кожен рядок окремо\n"
        "# Коментарі починаються з #\n"
        "\n"
        "# Telegram\n"
        "TELEGRAM_BOT_TOKEN=\n"
        "TELEGRAM_CHAT_ID=\n"
        "\n"
        "# OpenAI\n"
        "OPENAI_API_KEY=\n"
        "OPENAI_MODEL=gpt-4.1-mini\n"
        "OPENAI_IMAGE_MODEL=gpt-image-1\n"
        "\n"
        "# FFmpeg\n"
        "FFMPEG_PATH=ffmpeg\n"
        "\n"
    )


def _read_env_text(path: Path) -> str:
    if not path.exists():
        txt = _default_env_text()
        path.write_text(txt, encoding="utf-8")
        return txt
    try:
        return path.read_text(encoding="utf-8")
    except Exception:
        txt = _default_env_text()
        path.write_text(txt, encoding="utf-8")
        return txt


def _write_env_text(path: Path, text: str) -> None:
    text = (text or "").replace("\r\n", "\n")
    path.write_text(text, encoding="utf-8")


def _card(title: str, subtitle: str, body_html: str) -> str:
    return f"""
    <div class="card">
      <div class="card-h">
        <div class="card-title">{_esc(title)}</div>
        <div class="card-sub">{_esc(subtitle)}</div>
      </div>
      <div class="card-b">
        {body_html}
      </div>
    </div>
    """


def _kv(k: str, v: str) -> str:
    return f"""
    <div style="display:flex; gap:12px; padding:6px 0; border-bottom:1px solid #eee;">
      <div style="width:220px; color:#667; font-weight:600;">{_esc(k)}</div>
      <div style="flex:1; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">
        {_esc(v)}
      </div>
    </div>
    """


def _deny(u_role: str) -> bool:
    return str(u_role) == "manager"


@router.get("/project/{code}/env", response_class=HTMLResponse)
def project_env(request: Request, code: str, msg: str = "") -> HTMLResponse:
    r = require_user(request)
    if "redirect" in r:
        return r["redirect"]  # type: ignore
    u = r["user"]

    _, err_html = get_project_or_404(code, u.role)
    if err_html:
        return page_html("ENV проєкту", u.role, err_html, request_path=request.url.path)

    if _deny(u.role):
        content = _card("ENV проєкту", "Немає доступу", "<div class='pill pill-down'>Цей розділ доступний лише адміну.</div>")
        return page_html(f"ENV проєкту — {code}", u.role, content, request_path=request.url.path)

    client_code, err = _client_code_from_project(code)
    if err:
        return page_html("ENV проєкту", u.role, f"<div class='card'>{_esc(err)}</div>", request_path=request.url.path)

    sdir = _state_dir(client_code, code)
    env_path = _env_file(sdir)
    env_text = _read_env_text(env_path)

    banner = ""
    if msg:
        banner = f"<div class='pill pill-ok' style='margin-bottom:10px;'>{_esc(msg)}</div>"

    meta = ""
    meta += _kv("State (папка)", str(sdir))
    meta += _kv("Файл", str(env_path))
    meta += _kv("Час", _now_iso())

    body = f"""
    {banner}
    <div class="card" style="padding:12px;">
      {meta}
      <div class="muted" style="margin-top:10px;">
        Тут можна зберігати будь-які змінні (ключі, моделі, параметри). Це локальний .env тільки для цього проєкту.
      </div>
    </div>

    <div class="card" style="margin-top:14px;">
      <form method="post" action="/project/{_esc(code)}/env/save">
        <label>ENV (KEY=VALUE)</label>
        <textarea class="input" name="env_text" style="width:100%; height:520px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">{_esc(env_text)}</textarea>

        <div style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap;">
          <button class="btn btn-primary" type="submit">Зберегти</button>
        </div>
      </form>
    </div>
    """

    content = _card(
        "ENV проєкту",
        "Локальний .env для проєкту (state/env.txt). Доступно лише адміну.",
        body,
    )
    return page_html(f"ENV проєкту — {code}", u.role, content, request_path=request.url.path)


@router.post("/project/{code}/env/save")
async def project_env_save(request: Request, code: str, env_text: str = Form(...)) -> HTMLResponse:
    r = require_user(request)
    if "redirect" in r:
        return r["redirect"]  # type: ignore
    u = r["user"]

    _, err_html = get_project_or_404(code, u.role)
    if err_html:
        return page_html("ENV проєкту", u.role, err_html, request_path=request.url.path)

    if _deny(u.role):
        return RedirectResponse(url=f"/project/{code}/env?msg=Немає доступу", status_code=303)

    client_code, err = _client_code_from_project(code)
    if err:
        return page_html("ENV проєкту", u.role, f"<div class='card'>{_esc(err)}</div>", request_path=request.url.path)

    sdir = _state_dir(client_code, code)
    env_path = _env_file(sdir)

    _write_env_text(env_path, env_text)
    return RedirectResponse(url=f"/project/{code}/env?msg=Збережено", status_code=303)
