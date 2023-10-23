
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


