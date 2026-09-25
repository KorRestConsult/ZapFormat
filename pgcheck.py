#!/usr/bin/env python3
"""Read-only PartGrade diagnostic; standard library only, no stored credentials."""
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


def redact(text, secrets):
    for secret in sorted((s for s in secrets if s), key=len, reverse=True):
        for value in (secret, urllib.parse.quote(secret, safe=""),
                      urllib.parse.quote_plus(secret), json.dumps(secret)[1:-1]):
            text = text.replace(value, "[hidden]")
    return text


def summarize(status, body, secrets):
    print("HTTP:", status)
    try:
        data = json.loads(body)
    except (ValueError, UnicodeError):
        print("Ответ не в формате JSON. Доступ к каталогу не подтверждён.")
        return 1
    if status == 200 and isinstance(data, list):
        print("Поиск выполнен. Предложений:", len(data))
        for row in data[:5]:
            if isinstance(row, dict):
                selected = {key: row.get(key) for key in (
                    "brand", "number", "price", "availability", "deliveryPeriod")}
                print(redact(json.dumps(selected, ensure_ascii=False), secrets))
        return 0
    print("Доступ к каталогу не подтверждён. Ответ API:")
    print(redact(json.dumps(data, ensure_ascii=False), secrets)[:2000])
    return 1


def main():
    print("Проверка PartGrade: только поиск PATRON PRS3420, без создания заказа.")
    print("Логин и пароль не сохраняются. Оба поля скрыты при вводе.")
    login = getpass.getpass("Логин PartGrade: ").strip()
    password = getpass.getpass("Пароль PartGrade: ")
    if not login or not password:
        print("Пустые данные. Запрос не отправлен.")
        return 1
    hashed = hashlib.md5(password.encode()).hexdigest()
    query = urllib.parse.urlencode(dict(userlogin=login, userpsw=hashed,
        number="PRS3420", brand="PATRON", useOnlineStocks=1))
    opener = urllib.request.build_opener(NoRedirect())
    request = urllib.request.Request(HOST + "/search/articles/?" + query,
                                     headers={"Accept": "application/json"})
    print("Запрашиваю API…")
    try:
        with opener.open(request, timeout=30) as response:
            status, body = response.status, response.read(1024 * 1024)
    except urllib.error.HTTPError as error:
        status, body = error.code, error.read(65536)
    except (urllib.error.URLError, TimeoutError, OSError):
        print("Ошибка связи с API. Логин и пароль не выведены.")
        return 1
    return summarize(status, body, (login, password, hashed))


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (KeyboardInterrupt, EOFError):
        print("\nПроверка отменена.")
        sys.exit(1)
