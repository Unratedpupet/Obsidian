Class: [[Systems Biology]]
Date: 2023-10-23 22:47
Subject/Topic: **Clustering, Heatmaps, and PCA Review**


-------------
Notes:
## Overview

You have completed an RNASeq experiment and determined the expression level of the genes in your samples. So now what? How do you relate these lists of numbers to the underlying biology of the cells and tissues you are studying? One of the first steps is to consider how your samples are related based on their gene expression pattern, or conversely, to consider how the expression of groups of genes is related across samples. In this lesson, we will explore three methods for visualizing these relationships: clustering, heatmaps, and principal component analysis (PCA). These techniques can reveal novel sample relationships, such as new disease subtypes, common gene expression regulatory mechanisms, or pathways or biological processes that contribute to the differential phenotype of the samples.

- This is needed because transcriptomics produces high-dimensional data usually 20,000+ results.

#### Distance
 - The smaller the distance, the more similar the samples are.
 - There are many mathematical methods for calculating distance
	 - [[Euclidean]]
		 - Create a right triangle and the hypotenuse is the distance.
	 - Correlation
## Clustering
![[Pasted image 20231023224912.png]]
- Organize samples according to their distances from each other.
- Try to find how resulting clusters relate to the biology of the experiments
#### [[Hierarchical Clustering]]
Produces a dendrogram or tree
- Calculate all pairwise distances
- Merge the pair with the smallest distance into a single node
- Assign coordinates to the merged node that are an average of the component nodes
- Re-calculate all of the pairwise distances using the merged node in place of two individual nodes
- Repeat
![[Pasted image 20231023230705.png]]
#### [[K-means Clustering]]
![[Pasted image 20231023230731.png]]

## Heatmaps

![[Pasted image 20231023224927.png]]
![[Pasted image 20231023231341.png]]
Visually striking, ooooohhhh
Colored and clustered.
#### Sample Heatmap
- The samples are both the rows and columns. 
- ![[Pasted image 20231023231512.png]]
- ![[Pasted image 20231023231543.png]]
- 

## [[Principal Component Analysis]] (PCA)
![[Pasted image 20231023224940.png]]
![[Pasted image 20231023231816.png]]


# [[Gene Expression Omnibus]] (GEO)
a public repository for next-generation sequencing, microarray, and related omics data. Investigators deposit their raw data and corresponding metadata in GEO in a standardized format to make it freely available to the scientific community. The great majority of GEO deposits are gene expression experiments. Some of the experiments in GEO have been manually curated and provide advanced data visualization and analysis, including clustering and interactive heatmaps. These experiments can be found in GEO Datasets.