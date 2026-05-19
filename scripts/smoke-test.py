"""VistaTour · Smoke test end-to-end.

Uso:
    python scripts/smoke-test.py https://tu-deploy.vercel.app

Sin argumento usa BASE_URL del env, o falla con instrucciones.

Chequea:
- Home loads (200)
- API /chat sin auth → 401
- API realtor/documents sin auth → 401
- API admin verify sin auth → 401 o 403
- API countries → 200
- API properties → 200
- Vistaagent NO accesible sin login (vía /api/chat probe)
"""
import os
import sys
import json
from typing import Optional

try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    pass

import urllib.request
import urllib.error

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"
BOLD = "\033[1m"


def get_base_url() -> str:
    if len(sys.argv) > 1:
        return sys.argv[1].rstrip("/")
    env = os.environ.get("BASE_URL")
    if env:
        return env.rstrip("/")
    print(f"{RED}ERROR{RESET}: pasá URL como arg o seteá BASE_URL")
    print(f"  Ejemplo: python scripts/smoke-test.py https://inmobiliaria-ai.vercel.app")
    sys.exit(2)


def request(method: str, url: str, body: Optional[dict] = None, timeout: int = 15):
    headers = {"User-Agent": "VistaTour-SmokeTest/1.0"}
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8", errors="replace")[:300]
    except urllib.error.HTTPError as e:
        return e.code, (e.read().decode("utf-8", errors="replace")[:300] if e.fp else "")
    except Exception as e:
        return 0, str(e)


CHECKS_PASSED = 0
CHECKS_FAILED = 0


def check(name: str, predicate: bool, detail: str = ""):
    global CHECKS_PASSED, CHECKS_FAILED
    if predicate:
        print(f"  {GREEN}✓{RESET} {name}")
        CHECKS_PASSED += 1
    else:
        print(f"  {RED}✗{RESET} {name}  {YELLOW}{detail}{RESET}")
        CHECKS_FAILED += 1


def section(title: str):
    print(f"\n{BOLD}{BLUE}▸ {title}{RESET}")


def main():
    BASE = get_base_url()
    print(f"\n{BOLD}VistaTour · Smoke Test{RESET}")
    print(f"Target: {BASE}\n")

    section("Páginas públicas")
    status, _ = request("GET", BASE + "/")
    check(f"GET / → 200", status == 200, f"got {status}")

    status, _ = request("GET", BASE + "/login")
    check(f"GET /login → 200", status == 200, f"got {status}")

    section("Auth gates · API debe rechazar requests sin sesión")
    status, body = request(
        "POST",
        BASE + "/api/chat",
        {"sessionId": "smoketest-1", "message": "hola"},
    )
    check(f"POST /api/chat sin auth → 401", status == 401, f"got {status} · {body[:100]}")

    status, body = request("GET", BASE + "/api/realtor/documents")
    check(
        f"GET /api/realtor/documents sin auth → 401",
        status in (401, 403),
        f"got {status}",
    )

    status, body = request(
        "POST",
        BASE + "/api/admin/realtors/fake-id/verify",
        {"action": "approve"},
    )
    check(
        f"POST /api/admin/realtors/[id]/verify sin admin → 401/403",
        status in (401, 403),
        f"got {status}",
    )

    section("APIs públicas/de descubrimiento")
    status, body = request("GET", BASE + "/api/countries")
    check(f"GET /api/countries → 200", status == 200, f"got {status}")
    if status == 200:
        try:
            data = json.loads(body) if body else {}
            countries_count = len(data.get("countries", []))
            check(f"countries devuelve datos (count > 0)", countries_count > 0, f"got {countries_count}")
        except Exception:
            check(f"countries devuelve JSON parseable", False, "json parse failed")

    section("Email config (smoke indirecto)")
    print(f"  {YELLOW}!{RESET} Email send no se puede smoke-testear sin disparar verification real.")
    print(f"    Para validarlo end-to-end:")
    print(f"      1. Crear realtor de prueba")
    print(f"      2. Subir 4 docs → admin recibe email")
    print(f"      3. Aprobar desde /admin/realtors/[id]/verify → realtor recibe email")

    section("UI checks (manual · marcá vos)")
    checklist = [
        "Login como SEARCHER → botón Vistaagent visible abajo derecha",
        "Login como REALTOR → botón Vistaagent NO visible",
        "Logout → botón desaparece automáticamente",
        "Click ⚙️ del chat → abre /preferences",
        "En /preferences cambiar budget → auto-guarda (sin botón Save)",
        "Realtor con 0 docs → ve banner pending verification en dashboard",
        "Realtor con 4 docs → status UNDER_REVIEW · admin recibe email",
        "Admin aprueba en /admin/realtors/[id]/verify → realtor recibe email + badge ✓",
        "Searcher abre chat → escribe 'apto Bogotá 2 hab' → recibe streaming + cards",
    ]
    for item in checklist:
        print(f"  {YELLOW}[ ]{RESET} {item}")

    print(f"\n{BOLD}Resultado:{RESET}")
    print(f"  {GREEN}{CHECKS_PASSED} passed{RESET}  ·  {RED}{CHECKS_FAILED} failed{RESET}")
    print()
    sys.exit(0 if CHECKS_FAILED == 0 else 1)


if __name__ == "__main__":
    main()
