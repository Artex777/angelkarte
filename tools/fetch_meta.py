# Lädt die WebMap-Definition und die Metadaten aller Layer herunter (nur zur Analyse).
import json, os, urllib.request, urllib.parse
WEBMAP = "24533f5e5b154ba5bd5d03fa473abd86"
os.makedirs("meta/layers", exist_ok=True)
def get(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.load(r)
wm = get(f"https://www.arcgis.com/sharing/rest/content/items/{WEBMAP}/data?f=json")
json.dump(wm, open("meta/webmap.json", "w"), ensure_ascii=False, indent=1)
summary = []
def walk(layers):
    for l in layers:
        if l.get("layers"): walk(l["layers"])
        url = l.get("url")
        if not url: 
            summary.append({"title": l.get("title"), "type": l.get("layerType")}); continue
        try:
            m = get(url + "?f=json")
            c = get(url + "/query?where=1%3D1&returnCountOnly=true&f=json").get("count")
        except Exception as e:
            m, c = {"error": str(e)}, None
        name = urllib.parse.quote(l.get("id", l.get("title")), safe="")
        json.dump(m, open(f"meta/layers/{name}.json", "w"), ensure_ascii=False, indent=1)
        summary.append({"id": l.get("id"), "title": l.get("title"), "url": url, "visible": l.get("visibility"),
                        "geom": m.get("geometryType"), "count": c, "minScale": l.get("minScale", m.get("minScale")),
                        "maxScale": l.get("maxScale", m.get("maxScale")),
                        "renderer": (l.get("layerDefinition", {}).get("drawingInfo") or m.get("drawingInfo") or {}).get("renderer", {}).get("type"),
                        "fields": [f["name"] for f in m.get("fields", [])]})
walk(wm.get("operationalLayers", []))
json.dump({"basemap": wm.get("baseMap"), "layers": summary}, open("meta/summary.json", "w"), ensure_ascii=False, indent=1)
print(len(summary), "layers")
