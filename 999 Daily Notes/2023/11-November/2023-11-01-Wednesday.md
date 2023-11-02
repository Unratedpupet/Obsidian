---
created: <% tp.file.creation_date() %>
tags:
  - daily_note
modified: <% tp.file.last_modified_date("dddd Do MMMM YYYY HH:mm:ss") %>
---

# <% moment(tp.file.title,'YYYY-MM-DD').format("dddd, MMMM DD, YYYY") %>

<< [[<% fileDate = moment(tp.file.title, 'YYYY-MM-DD-dddd').subtract(1, 'd').format('YYYY-MM-DD-dddd') %>|Yesterday]] | [[<% fileDate = moment(tp.file.title, 'YYYY-MM-DD-dddd').add(1, 'd').format('YYYY-MM-DD-dddd') %>|Tomorrow]] >>

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
TABLE FROM "" WHERE file.mday = date("<%tp.date.now("YYYY-MM-DD")%>") SORT file.mtime asc
```
