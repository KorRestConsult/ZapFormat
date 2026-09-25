#!/usr/bin/env python3
"""Read-only PartGrade/ABCP diagnostic. No credentials are stored or printed."""
import getpass
import hashlib
import json
import sys
import urllib.error
import urllib.parse
import urllib.request

HOST = "https://auto-complekt.public.api.abcp.ru"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def request_json(path, login, password_hash, extra=None):
    params = {"userlogin": login, "userpsw": password_hash}
    if extra:
        params.update(extra)
    query = urllib.parse.urlencode(params)
    opener = urllib.request.build_opener(NoRedirect())
    request = urllib.request.Request(
        HOST + path + ("&" if "?" in path else "?") + query,
        headers={"Accept": "application/json"},
    )
    try:
        with opener.open(request, timeout=30) as response:
            status = response.status
            body = response.read(1024 * 1024)
    except urllib.error.HTTPError as error:
        status = error.code
        body = error.read(65536)
    except (urllib.error.URLError, TimeoutError, OSError):
        return None, {"localError": "network_error"}

    try:
        return status, json.loads(body)
    except (ValueError, UnicodeError):
        return status, {"localError": "invalid_json"}


def short_error(data):
    if isinstance(data, dict):
        return {
            key: data.get(key)
            for key in ("errorCode", "errorMessage", "message", "localError")
            if data.get(key) is not None
        }
    return data


def main():
    print("Диагностика PartGrade API. Ничего не заказываем и не изменяем.")
    print("Логин и пароль вводятся скрыто и не сохраняются.")
    login = getpass.getpass("Логин PartGrade: ").strip()
    password = getpass.getpass("Пароль PartGrade: ")
    if not login or not password:
        print("Пустые данные. Проверка отменена.")
        return 1

    password_hash = hashlib.md5(password.encode()).hexdigest()
    candidates = []
    for candidate in (login, login.lower()):
        if candidate not in candidates:
            candidates.append(candidate)

    working_login = None
    for index, candidate in enumerate(candidates, start=1):
        print(f"\nШаг 1.{index}: проверяю авторизацию через user/info…")
        status, data = request_json("/user/info", candidate, password_hash)
        if status == 200 and isinstance(data, dict) and not data.get("errorCode"):
            working_login = candidate
            print("Авторизация подтверждена.")
            break
        print("Авторизация не подтверждена.")
        print("HTTP:", status)
        print(json.dumps(short_error(data), ensure_ascii=False))

    if not working_login:
        print("\nИтог: проблема НЕ в скачивании скрипта и НЕ в JSON.")
        print("ABCP не принимает сочетание userlogin + MD5 текущего пароля.")
        print("Нужно у PartGrade подтвердить точный API-login и активацию API для этого кабинета.")
        return 2

    print("\nШаг 2: проверяю каталог PATRON PRS3420…")
    status, data = request_json(
        "/search/articles/",
        working_login,
        password_hash,
        {"number": "PRS3420", "brand": "PATRON"},
    )
    print("HTTP:", status)
    if status == 200 and isinstance(data, list):
        print("Каталог доступен. Предложений:", len(data))
        for row in data[:5]:
            if isinstance(row, dict):
                selected = {
                    key: row.get(key)
                    for key in ("brand", "number", "price", "availability", "deliveryPeriod")
                }
                print(json.dumps(selected, ensure_ascii=False))
        return 0

    print("Авторизация работает, но каталог не подтверждён.")
    print(json.dumps(short_error(data), ensure_ascii=False))
    return 3


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (KeyboardInterrupt, EOFError):
        print("\nПроверка отменена.")
        sys.exit(1)
