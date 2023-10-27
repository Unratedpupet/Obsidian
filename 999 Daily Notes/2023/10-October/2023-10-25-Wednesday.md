tags:: [[+Daily Notes]]

# Wednesday, October 25, 2023

<< [[2023-10-24-Tuesday|Yesterday]] | [[2023-10-26-Thursday|Tomorrow]] >>

---
# Tasks
```todoist
name: Today
filter: "today | overdue"
```

<<<<<<< HEAD
[[Todoist Inbox]]
=======
#### [[Todoist]]
>>>>>>> origin/main
---
# 📝 Notes
- It gets frustrating listening to Becky complain about having to do extra work. I'm worried that she is suffering from depression, and wont do anything about it. 
	- She has such a hard time with the baby still.
- I managed to somewhat figure out [[Zotero]] integration to Obsidian. I also was able to find some research papers and how to read and annotate in Zotero. I found one article about machine learning and CPR outcomes which I look forward to reading.
	- It did unfortunately take me down a rabbit hole of procrastination.
- 

---
### Notes created today
```dataview
List FROM "" WHERE file.cday = date("2023-10-25") SORT file.ctime asc
```

### Notes last touched today
```dataview
List FROM "" WHERE file.mday = date("2023-10-25") SORT file.mtime asc
```tags:: [[+Daily Notes]]

# <% moment(tp.file.title,'YYYY-MM-DD').format("dddd, MMMM DD, YYYY") %>

<< [[<% fileDate = moment(tp.file.title, 'YYYY-MM-DD-dddd').subtract(1, 'd').format('YYYY-MM-DD-dddd') %>|Yesterday]] | [[<% fileDate = moment(tp.file.title, 'YYYY-MM-DD-dddd').add(1, 'd').format('YYYY-MM-DD-dddd') %>|Tomorrow]] >>

---
# Tasks
```todoist
name: Today
filter: "today | overdue"
```

<<<<<<< HEAD
[[Todoist Inbox]]
=======
#### [[Todoist]]
>>>>>>> origin/main
---
# 📝 Notes
- 

---
### Notes created today
```dataview
List FROM "" WHERE file.cday = date("<%tp.date.now("YYYY-MM-DD")%>") SORT file.ctime asc
```

### Notes last touched today
```dataview
List FROM "" WHERE file.mday = date("<%tp.date.now("YYYY-MM-DD")%>") SORT file.mtime asc
```