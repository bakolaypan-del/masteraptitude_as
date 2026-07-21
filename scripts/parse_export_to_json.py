import os
import sys
import json
from typing import Dict
from base64 import b64decode

try:
    import leveldb_export.export
    from leveldb_export import parse_leveldb_documents
except ImportError:
    print("Error: The 'leveldb-export' package is not installed.")
    print("Please run: pip install leveldb-export")
    sys.exit(1)

# Custom parser that doesn't crash on datastore EMPTY_LIST/meaning assertions
def custom_embedded_entity_to_dict(embedded_entity, data):
    from google.appengine.datastore import entity_bytes_pb2 as entity_pb2
    from google.protobuf.json_format import MessageToDict
    from leveldb_export.utils import get_value
    
    ep = entity_pb2.EntityProto()
    ep.ParseFromString(embedded_entity)
    d = MessageToDict(ep)
    for entry in d.get("rawProperty", []):
        name = entry["name"]
        encoded_value = entry["value"]

        # Nested object
        if entry.get("meaning") == "ENTITY_PROTO":
            value = custom_embedded_entity_to_dict(get_value(encoded_value, raw=True), {})
        else:
            value = get_value(encoded_value)

        # Value is array type
        if entry["multiple"]:
            data.setdefault(name, [])
            data[name].append(value)
        else:
            data[name] = value

    for entry in d.get("property", []):
        name = entry["name"]
        encoded_value = entry.get("value")
        if encoded_value:
            value = get_value(encoded_value)
            if entry.get("meaning") == "ENTITY_PROTO":
                value = custom_embedded_entity_to_dict(get_value(encoded_value, raw=True), {})
            if entry["multiple"]:
                data.setdefault(name, [])
                data[name].append(value)
            else:
                data[name] = value
        else:
            data[name] = []

    return data

# Apply monkeypatch
leveldb_export.export.embedded_entity_to_dict = custom_embedded_entity_to_dict

def main():
    # Paths relative to the project root
    export_file = os.path.abspath("bakolaypan/2026-07-21T06_33_16_83174/all_namespaces/all_kinds/output-0")
    output_dir = os.path.abspath("migration_data")
    
    if not os.path.exists(export_file):
        print(f"Error: Export file not found at {export_file}")
        sys.exit(1)
        
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    print("Parsing Firestore binary export offline...")
    try:
        docs = list(parse_leveldb_documents(export_file))
        print(f"Successfully read {len(docs)} documents.")
        
        # Group documents by collection
        collections = {}
        for doc in docs:
            key_info = doc.get("_key", {})
            path = key_info.get("path", "")
            parts = path.split("/")
            
            # The document ID is the last part, the collection is the rest of the path
            if len(parts) >= 2:
                col_name = parts[0]
                doc_id = parts[-1]
                
                # Strip out metadata helper properties we added
                clean_doc = doc.copy()
                if "_key" in clean_doc:
                    del clean_doc["_key"]
                
                collections.setdefault(col_name, {})[doc_id] = clean_doc
            else:
                collections.setdefault("unknown_collection", {})[doc.get("id", "doc")] = doc

        # Custom JSON Encoder to handle datetime objects
        class DateTimeEncoder(json.JSONEncoder):
            def default(self, obj):
                import datetime
                if isinstance(obj, (datetime.datetime, datetime.date)):
                    return obj.isoformat()
                return super().default(obj)

        print("\nWriting JSON files to 'migration_data/':")
        for col_name, col_data in collections.items():
            file_path = os.path.join(output_dir, f"{col_name}.json")
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(col_data, f, cls=DateTimeEncoder, ensure_ascii=False, indent=2)
            print(f"- migration_data/{col_name}.json (saved {len(col_data)} documents)")
            
        print("\n[OK] Offline migration data extraction completed successfully!")
        
    except Exception as e:
        import traceback
        print("Failed parsing Firestore export:")
        traceback.print_exc()

if __name__ == '__main__':
    main()
