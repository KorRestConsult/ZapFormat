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

def compact(data):
    if isinstance(data, dict):
        return {
            key: data.get(key)
            for key in ("errorCode", "errorMessage", "message", "localError")
            if data.get(key) is not None
        }
    if isinstance(data, list):
        return {"items": len(data)}
    return data

def classify(status, data):
    if status == 200:
        return "OK"
    if isinstance(data, dict):
        code = data.get("errorCode")
        if code == 102:
            return "AUTH_ERROR_102"
        if code == 103:
            return "ACCESS_DENIED_103"
    return "ERROR"

def run_check(title, path, login, password_hash, extra=None):
    print(f"\n{title}")
    status, data = request_json(path, login, password_hash, extra)
    result = classify(status, data)
    print("HTTP:", status)
    print("Результат:", result)
    print(json.dumps(compact(data), ensure_ascii=False))
    return result, data

def main():
    print("Диагностика PartGrade API. Только чтение: ничего не заказываем и не изменяем.")
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

    overall = []
    for candidate in candidates:
        print("\n========================================")
        print("Проверяю вариант логина:", "[введённый]" if candidate == login else "[нижний регистр]")

        checks = [
            ("1) user/info — базовая авторизация", "/user/info", None),
            ("2) search/brands — поиск бренда по PRS3420", "/search/brands/", {"number": "PRS3420", "locale": "ru_RU"}),
            ("3) search/articles — предложения PATRON PRS3420", "/search/articles/", {
                "number": "PRS3420", "brand": "PATRON", "locale": "ru_RU"
            }),
        ]

        for title, path, extra in checks:
            result, data = run_check(title, path, candidate, password_hash, extra)
            overall.append((candidate, title, result))
            if result == "OK" and isinstance(data, list) and data:
                print("Первые строки:")
                for row in data[:3]:
                    if isinstance(row, dict):
                        selected = {
                            key: row.get(key)
                            for key in ("brand", "number", "description", "price", "availability", "deliveryPeriod")
                            if key in row
                        }
                        print(json.dumps(selected, ensure_ascii=False))

    print("\n========================================")
    print("ИТОГ")
    ok_count = sum(1 for _, _, result in overall if result == "OK")
    auth102 = sum(1 for _, _, result in overall if result == "AUTH_ERROR_102")
    denied103 = sum(1 for _, _, result in overall if result == "ACCESS_DENIED_103")
    print("Успешных методов:", ok_count)
    print("102 (ошибка авторизации):", auth102)
    print("103 (доступ запрещён):", denied103)

    if ok_count:
        print("API частично или полностью работает. Один код 103 не означает, что весь API закрыт.")
        return 0
    if denied103 and not auth102:
        print("Учётные данные, вероятно, распознаются, но проверенные методы запрещены правами.")
        print("Это не поломка сервера/скрипта; нужно проверить, какие методы разрешены аккаунту.")
        return 3
    if auth102:
        print("Есть ошибка 102: ABCP не принимает сочетание userlogin + MD5 текущего пароля.")
        return 2

    print("Доступ не подтверждён; смотрим конкретные HTTP/ответы выше.")
    return 4

if __name__ == "__main__":
    try:
        sys.exit(main())
    except (KeyboardInterrupt, EOFError):
        print("\nПроверка отменена.")
        sys.exit(1)
