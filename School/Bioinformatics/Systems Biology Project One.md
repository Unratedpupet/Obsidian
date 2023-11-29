---
created: 2023-10-29 1820
tags:
  - school
  - bioinformatics
modified: <% tp.file.last_modified_date("dddd Do MMMM YYYY HH:mm:ss") %>
references:
  - "[[Systems Biology]]"
  - "[[R Language]]"
---

[[Systems Biology]]

-------------
Notes:
- Going to compare Heart and Skeletal muscle tissues.
	- Both are muscles, however heart has automaticity.
	- Did get one research paper on it that is in Zotero, still need to finish reading, annotating, and importing. #TODO 
- The project should follow modules 12-17 for the actual work, but still needs to be written using the format given.
- 

## HPC Work
- Running the TRIMMING using trim_galore. Took a little bit to figure out the for loops in bash, but working now for 1+ hour. 
- Next is going to be the MAPPING, which should also take time. I hope, I finished the mapping.slurm script, but will have to wait to see what happens.
- After the MAPPING, I need to run the SORTING and INDEXING
	- It is the BAMINDEX.slurm file that still needs to be scripted 
- Counting comes next. 
- Finished HPC work

## R Analysis
- Created a workbook to use
	- Packages used:
		- [[pheatmap]]
		- [[DESeq2]]
		- [[RColorBrewer]]
		- [[edgeR]]
- Finished analysis up to module 16


## Genes of interest
![[Pasted image 20231109225003.png]]
- [NPPA](https://www.ncbi.nlm.nih.gov/gene/4878)
	- The protein encoded by this gene belongs to the natriuretic peptide family. Natriuretic peptides are implicated in the control of extracellular fluid volume and electrolyte homeostasis. This protein is synthesized as a large precursor (containing a signal peptide), which is processed to release a peptide from the N-terminus with similarity to vasoactive peptide, cardiodilatin, and another peptide from the C-terminus with natriuretic-diuretic activity. ==Mutations in this gene have been associated with atrial fibrillation familial type 6==. This gene is located adjacent to another member of the natriuretic family of peptides on chromosome 1.
- [TNNT2](https://www.ncbi.nlm.nih.gov/gene/7139)
	- This gene encodes the cardiac isoform of troponin T. The encoded protein is the tropomyosin-binding subunit of the troponin complex, which is located on the thin filament of striated muscles and regulates muscle contraction in response to alterations in intracellular calcium ion concentration. Mutations in this gene have been associated with familial hypertrophic cardiomyopathy as well as with dilated cardiomyopathy.
- [MYL7](https://www.ncbi.nlm.nih.gov/gene/58498)
	- Predicted to enable calcium ion binding activity
- [RYR2](https://www.ncbi.nlm.nih.gov/gene/6262)
	- This gene encodes a ryanodine receptor found in cardiac muscle sarcoplasmic reticulum. The encoded protein is one of the components of a calcium channel, composed of a tetramer of the ryanodine receptor proteins and a tetramer of FK506 binding protein 1B proteins, that supplies calcium to cardiac muscle. Mutations in this gene are associated with stress-induced polymorphic ventricular tachycardia and arrhythmogenic right ventricular dysplasia.
- [MYBPC3](https://www.ncbi.nlm.nih.gov/gene/4607)
	- MYBPC3 encodes the cardiac isoform of myosin-binding protein C. Myosin-binding protein C is a myosin-associated protein found in the cross-bridge-bearing zone (C region) of A bands in striated muscle. MYBPC3 is expressed exclusively in heart muscle and is a key regulator of cardiac contraction. Mutations in this gene are a frequent cause of familial hypertrophic cardiomyopathy.
- [ATP1A3](https://www.ncbi.nlm.nih.gov/gene/478)
	- The protein encoded by this gene belongs to the family of P-type cation transport ATPases, and to the subfamily of Na+/K+ -ATPases. Na+/K+ -ATPase is an integral membrane protein responsible for establishing and maintaining the electrochemical gradients of Na and K ions across the plasma membrane. These gradients are essential for osmoregulation, for sodium-coupled transport of a variety of organic and inorganic molecules, and for electrical excitability of nerve and muscle. This enzyme is composed of two subunits, a large catalytic subunit (alpha) and a smaller glycoprotein subunit (beta). The catalytic subunit of Na+/K+ -ATPase is encoded by multiple genes. This gene encodes an alpha 3 subunit. Alternatively spliced transcript variants encoding different isoforms have been found for this gene.
- [BMP10](https://www.ncbi.nlm.nih.gov/gene/27302)
	- This gene encodes a secreted ligand of the TGF-beta (transforming growth factor-beta) superfamily of proteins. Ligands of this family bind various TGF-beta receptors leading to recruitment and activation of SMAD family transcription factors that regulate gene expression. The encoded preproprotein is proteolytically processed to generate the mature protein, which binds to the activin receptor-like kinase 1 (ALK1) and ==plays important roles in cardiovascular development including cardiomyocyte proliferation and regulation of heart size, closure of the ductus arteriosus, angiogenesis and ventricular trabeculation.==
		- Ventricular trabeculation
			- In left ventricular non-compaction cardiomyopathy (LVNC) contains **bundles or pieces of muscle that extend into the chamber**. These pieces of muscles are called trabeculations.


## Interim paper was submitted. 11-10-23 @ 2230

This is a good start, however I had to remove points as you did not clearly state your hypothesis…although I could reason out based on your background. State your hypothesis clearly in final report

You also seem to be missing a results narrative (or what you are considering the narrative looks like figure captions. The results narrative needs to be more comprehensive.
