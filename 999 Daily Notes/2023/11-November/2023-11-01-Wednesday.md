---
created: <% tp.file.creation_date() %>
tags:
  - daily_note
modified: <% tp.file.last_modified_date("dddd Do MMMM YYYY HH:mm:ss") %>
---
---
created: 2023-11-01 23:29
tags:
  - daily_note
modified: Wednesday 1st November 2023 23:29:15
---

# Wednesday, November 01, 2023

<< [[2023-10-31-Tuesday|Yesterday]] | [[2023-11-02-Thursday|Tomorrow]] >>

---
# Tasks
```todoist
name: Today
filter: "today | overdue"
```

## [[Todoist Inbox]]

---
# 📝 Notes
- 

---
### Notes created today
```dataview
TABLE created, updated as modified, tags, type, status
FROM "" AND !"Daily Journal" AND !"Templates"
WHERE contains(dateformat(file.ctime, "YYYY-MM-dd"), dateformat(this.file.day, "YYYY-MM-dd"))
```

### Notes last touched today
```dataview
TABLE FROM "" WHERE file.mday = date("2023-11-01") SORT file.mtime asc
```

