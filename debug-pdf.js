const fs = require('fs');
const PDFParser = require("pdf2json");

async function debugPDF() {
  try {
    const url = 'https://mitrandadhabaglassyjunction.com.au/bvtodaysmenu.pdf';
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const pdfParser = new PDFParser(null, 1);
    pdfParser.on("pdfParser_dataError", (errData) => console.error(errData.parserError));
    pdfParser.on("pdfParser_dataReady", (pdfData) => {
        console.log("--- RAW TEXT START ---");
        console.log(pdfParser.getRawTextContent());
        console.log("--- RAW TEXT END ---");
    });
    pdfParser.parseBuffer(buffer);
  } catch (error) {
    console.error(error);
  }
}

debugPDF();
