Class: [[Systems Biology]]
Date: 2023-10-24 12:27
Subject/Topic: # 15.3 Tutorial: Exploring Sample Relationships in R


-------------
## Notes:
- Trying to install packages on non-vm RStudio is a pain. Both [[genefilter]] and [[DESeq2]] is not available for recent versions of R.
	- Was able to get genefilter installed
		- if (!require("BiocManager", quietly = TRUE))
		    install.packages("BiocManager")

			BiocManager::install("genefilter")
	- Same with DESeq2 
- For some reason, every time you open [[RStudio]], you need to check the packages again.
	- Also, even if you save the workspace, when you reopen, you need to make sure to browse to the working directory again.
- Parameters for the read.table function: 
	- file = “filename”: tells R the name of the file you want to load
	- sep = “\t”: indicates that the columns in the file are tab-delimited
	- header = T: indicates that the first row is a header line
	- names=1: indicates that the first column should be used as row names in the table in R
- Creating a DESeqDataSet from the Input Data DESeq stores the necessary data (counts table and metadata) in a specialized format called a DESeqDataSet. More information about DESeqDataSets can be found at http://www.bioconductor.org/help/workflows/rnaseqGene/#the-deseqdataset-sampleinformation-and-the-design-formula. To convert our data into a DESeqDataS
- 