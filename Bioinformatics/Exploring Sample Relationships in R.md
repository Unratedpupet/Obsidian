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

- Many statistical analyses of RNAseq data, including PCA, work best when the variance of the values for genes across samples is approximately the same regardless of the mean number of reads. However, for raw read counts, the variance tends to be larger for genes with a higher mean read count. This property tends to overemphasize the importance of highly expressed genes in the PCA plot. Doing a simple log transformation of the values causes the opposite problem: genes with low expression will dominate the PCA. A good compromise is the regularized log transformation (rlog). For more information, see http://www.bioconductor.org/help/workflows/rnaseqGene/#the-rlog-and-variancestabilizing-transformations.
- Perform the rlog transformation:
	- rld <- rlog(data_deseq, blind=FALSE)
	- Note: This operation might take some time.
- From now on, we will be using the transformed version of our DESeqDataSet (called rld). The format of the data in the transformed version is slightly different than the original. For example, the table of read counts is now accessed using "assay" rather than "counts".