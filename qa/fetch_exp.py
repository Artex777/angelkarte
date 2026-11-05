# Lädt die Konfiguration der offiziellen Experience-App (welche WebMap, welche Ebenen sichtbar)
import json, urllib.request, os
os.makedirs("qa/exp", exist_ok=True)
def get(u):
    with urllib.request.urlopen(u, timeout=60) as r: return json.load(r)
for name, u in {
    "item": "https://www.arcgis.com/sharing/rest/content/items/1e55c4d522b548ec99df662a8846c244?f=json",
    "config": "https://www.arcgis.com/sharing/rest/content/items/1e55c4d522b548ec99df662a8846c244/data?f=json",
}.items():
    json.dump(get(u), open(f"qa/exp/{name}.json", "w"), ensure_ascii=False, indent=1)
cfg = json.load(open("qa/exp/config.json"))
for k, v in (cfg.get("dataSources") or {}).items():
    print("DS", k, v.get("type"), v.get("itemId"), v.get("portalUrl"))
    if v.get("type") == "WEB_MAP" and v.get("itemId"):
        json.dump(get(f"https://www.arcgis.com/sharing/rest/content/items/{v['itemId']}/data?f=json"), open(f"qa/exp/webmap_{v['itemId']}.json", "w"), ensure_ascii=False, indent=1)
        json.dump(get(f"https://www.arcgis.com/sharing/rest/content/items/{v['itemId']}?f=json"), open(f"qa/exp/webmapitem_{v['itemId']}.json", "w"), ensure_ascii=False, indent=1)
