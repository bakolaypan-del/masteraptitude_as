import psycopg2
import json

DB_URI = "postgresql://postgres.jwntggzietgsiazjlkbk:Sumankolay%401995@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres"

def update():
    conn = psycopg2.connect(DB_URI)
    cur = conn.cursor()

    cur.execute("UPDATE tests SET category = 'WBP' WHERE category = 'WBP Constable' OR id = 'wbp_constable_pre_2021';")
    print("Updated tests rows:", cur.rowcount)

    cur.execute("SELECT id, data FROM pyqs WHERE id = 'pyq_wbp_constable_pre_2021';")
    row = cur.fetchone()
    if row:
        d = row[1] if isinstance(row[1], dict) else json.loads(row[1])
        d['category'] = 'WBP'
        d['subject'] = 'State Exams / WBP'
        cur.execute("UPDATE pyqs SET data = %s WHERE id = 'pyq_wbp_constable_pre_2021';", (json.dumps(d),))
        print("Updated pyq_wbp_constable_pre_2021 data")

    conn.commit()
    cur.close()
    conn.close()
    print("Category successfully updated to 'WBP' in Postgres DB!")

if __name__ == "__main__":
    update()
