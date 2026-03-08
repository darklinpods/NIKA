const fs = require('fs');
const PizZip = require('pizzip');

const TEMPLATE_IN = require('path').resolve(__dirname, '../../skills/templates/traffic_accident.docx');

const buf = fs.readFileSync(TEMPLATE_IN, 'binary');
const zip = new PizZip(buf);
let xml = zip.file('word/document.xml').asText();

// Search for 诉讼请求 allowing xml tags in between
const reqPattern = /<w:t>诉[\s\S]*?讼[\s\S]*?请[\s\S]*?求[\s\S]*?<\/w:t>/;
const match = xml.match(reqPattern);

if (match) {
    const index = match.index;
    // Find the closing </w:p> for this paragraph
    const pEndIndex = xml.indexOf('</w:p>', index) + 6;
    
    // Create a simple Word table structure with our {claimsTablePlaceholder}
    const tableXml = `
        <w:tbl>
            <w:tblPr>
                <w:tblStyle w:val="TableGrid"/>
                <w:tblW w:w="0" w:type="auto"/>
                <w:tblBorders>
                    <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                    <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                    <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                    <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                    <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                    <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                </w:tblBorders>
                <w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>
            </w:tblPr>
            <w:tblGrid>
                <w:gridCol w:w="800"/>
                <w:gridCol w:w="2500"/>
                <w:gridCol w:w="2000"/>
                <w:gridCol w:w="3700"/>
            </w:tblGrid>
            <w:tr>
                <w:tc><w:tcPr><w:tcW w:w="800" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="EEEEEE"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="微软雅黑" w:eastAsia="微软雅黑" w:hAnsi="微软雅黑"/><w:b/><w:sz w:val="21"/></w:rPr><w:t>序号</w:t></w:r></w:p></w:tc>
                <w:tc><w:tcPr><w:tcW w:w="2500" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="EEEEEE"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="微软雅黑" w:eastAsia="微软雅黑" w:hAnsi="微软雅黑"/><w:b/><w:sz w:val="21"/></w:rPr><w:t>类别</w:t></w:r></w:p></w:tc>
                <w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="EEEEEE"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="微软雅黑" w:eastAsia="微软雅黑" w:hAnsi="微软雅黑"/><w:b/><w:sz w:val="21"/></w:rPr><w:t>主张金额(元)</w:t></w:r></w:p></w:tc>
                <w:tc><w:tcPr><w:tcW w:w="3700" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="EEEEEE"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="微软雅黑" w:eastAsia="微软雅黑" w:hAnsi="微软雅黑"/><w:b/><w:sz w:val="21"/></w:rPr><w:t>备注说明</w:t></w:r></w:p></w:tc>
            </w:tr>
            <w:tr>
                <w:tc>
                    <w:tcPr><w:tcW w:w="9000" w:type="dxa"/><w:gridSpan w:val="4"/></w:tcPr>
                    <w:p><w:r><w:t>{claimsTablePlaceholder}</w:t></w:r></w:p>
                </w:tc>
            </w:tr>
        </w:tbl>
        <w:p><w:r><w:t xml:space="preserve"> </w:t></w:r></w:p>
    `;

    xml = xml.slice(0, pEndIndex) + tableXml + xml.slice(pEndIndex);
    
    zip.file('word/document.xml', xml);
    const out = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    fs.writeFileSync(TEMPLATE_IN, out);
    console.log('Successfully inserted table into original template docx!');
} else {
    console.log('Could not find 诉讼请求');
}
