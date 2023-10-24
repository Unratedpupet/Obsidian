
Class: [[Systems Biology]]
Date: 2023-10-22 23:08
Subject/Topic: R Language


-------------
Notes:
# What is R?
- Used for statistics and analysis.
- It is [[Object Oriented Programming]] in Batch mode.
- Uses [[RStudio]] as IDE, can use [[VSCode]], but more feature rich with RStudio
- Interactive mode through RStudio but batch mode uses a file that can be run.
- History vs Workspace
	- History saves the list of commands used in a session
		 ```r
		savehistory()
		```
	- Workspace saves the entire environment
		```r
		save() or save.image()
		```
# Variables and Data Structures
## Data Structure types
	- Vector
	- Matrix
	- List
	- Data Frame
- R doesn't use scalar variables, they are just vectors with one element
- To assign a variable, the data gets pointed into the variable
	- Uses index start of 1. Instead of 0 index.
	- x<-10
	- x<-c(10,15,25,35,60)
		- The c() method stands for 'combine'
	- ![[Pasted image 20231022231938.png]]
## Matrices
- Matrix is a vector with dimensions
## Lists
- Lists are collections of objects of different sizes and types  
	(results of functions are often returned as lists)
## Data Frame
- Data Frames are a table of data saved as an object
- It looks somewhat like a matrix, behaves somewhat the same but is a cross between a matrix and a list
## Operators
![[Pasted image 20231022232844.png]]
- TRUE = 1
- FALSE = 0
## Control Structures
- if statements
	```r
	if (conditional) {
	} else if (condtional_2) {
	} else {
	}
```
- for loops
	- for (i in 1:10) { }
- while loops
		i<-10
		while (i>5) {
			print (i)
			i<-i-1
		}

### Interacting with files
![[Pasted image 20231023222228.png]]
 - cat("Text I want to output",file="output.file")
 - There is also a write.table()
	 - used for data frames and lists
 -  Parameters for the read.table function: 
	- file = “filename”: tells R the name of the file you want to load
	- sep = “\t”: indicates that the columns in the file are tab-delimited
	- header = T: indicates that the first row is a header line
	- names=1: indicates that the first column should be used as row names in the table in R

### Functions
```r
oddcount <- function(x) {
	k<-0
	for (n in x) {
		if (n%%2==1) k<-k+1
	}
	return (k)
	}
}
oddcount(c(1,2,3,7,8,5,71,4,6,80))
```
 
## Plotting
![[Pasted image 20231023223249.png]]

# Notebooks
Similar to Jupyter notebooks with [[Python]]
Allows you to input your notes and thoughts without having it in the code.
Makes it easier to share the code. Allows you to write comments about any code chunk.
Can actually use different coding languages in the notebook.
When you insert comments, #, it allows you to collapse the areas of the notebook in between the '#'.
Uses [[Markdown language]]. If you open it up in the html format, it will use common markdown syntax.
