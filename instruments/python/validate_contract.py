"""Independent Python checks for the narrow, synthetic v1 contract bench.

Only payload structure and local consistency are checked here. The application
owns references, authorization, persistence, and acceptance decisions.
"""

import hashlib
import json
import re
import sys

JS_WHITESPACE = "\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff"


def text(value, maximum=200, allow_empty=False):
    return (isinstance(value, str)
            and len(value.encode("utf-16-le", "surrogatepass")) // 2 <= maximum
            and (allow_empty or bool(value.strip(JS_WHITESPACE)))
            and re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", value) is None)


def identifier(value):
    return (text(value, 120) and re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_.:-]*", value) is not None
            and value not in ("__proto__", "prototype", "constructor"))


def fields(value, required, optional=()):
    return (isinstance(value, dict)
            and set(required).issubset(value)
            and set(value).issubset(set(required) | set(optional)))


def criterion(value):
    if not fields(value, ("id", "label", "kind", "slot"), ("pattern",)):
        return False
    if not identifier(value["id"]) or not identifier(value["slot"]) or not text(value["label"], 500):
        return False
    if value["kind"] == "contains":
        return text(value.get("pattern"), 4000)
    return value["kind"] in ("human", "nonempty") and "pattern" not in value


def dependency(value):
    if not fields(value, ("goalId", "revision", "acceptanceId")):
        return False
    # bool is an int subclass in Python, but is never a wire integer.
    revision = value["revision"]
    return (identifier(value["goalId"]) and identifier(value["acceptanceId"])
            and type(revision) in (int, float)
            and revision == int(revision) and 0 < revision <= 9007199254740991)


def goal(value):
    if not fields(value, ("title", "description", "slots", "criteria"), ("dependencies",)):
        return False
    if not text(value["title"], 240) or not text(value["description"], 12000, True):
        return False
    slots = value["slots"]
    if not isinstance(slots, list) or not 1 <= len(slots) <= 32 or not all(identifier(slot) for slot in slots):
        return False
    if len(set(slots)) != len(slots):
        return False
    criteria = value["criteria"]
    if not isinstance(criteria, list) or not 1 <= len(criteria) <= 64 or not all(criterion(item) for item in criteria):
        return False
    if len({item["id"] for item in criteria}) != len(criteria):
        return False
    if not all(item["slot"] in slots for item in criteria):
        return False
    if "dependencies" in value:
        dependencies = value["dependencies"]
        if not isinstance(dependencies, list) or len(dependencies) > 32 or not all(dependency(item) for item in dependencies):
            return False
        if len({item["goalId"] for item in dependencies}) != len(dependencies):
            return False
    return True


def main():
    if len(sys.argv) != 3:
        raise ValueError("Expected request and output paths")
    with open(sys.argv[1], "rb") as handle:
        raw = handle.read()
    request = json.loads(raw)
    if (request.get("protocol") != "opencorral-conformance/v1"
            or not text(request.get("runId")) or not isinstance(request.get("cases"), list)):
        raise ValueError("Invalid conformance request")
    results = []
    for item in request["cases"]:
        if not text(item.get("id")) or item.get("contract") not in ("criterion", "createGoal"):
            raise ValueError("Unknown contract case")
        check = criterion if item["contract"] == "criterion" else goal
        results.append({"id": item["id"], "valid": check(item["payload"])})
    output = {"protocol": request["protocol"], "runId": request["runId"],
              "runtime": "Python " + sys.version.split()[0],
              "requestDigest": hashlib.sha256(raw).hexdigest(), "results": results}
    with open(sys.argv[2], "x", encoding="utf-8") as handle:
        json.dump(output, handle, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()
