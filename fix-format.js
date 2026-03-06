const fs = require('fs');
let code = fs.readFileSync('client/components/complaintGenerator/ComplaintGeneratorView.tsx', 'utf8');

// The original file ended correctly at around 677 lines, but it was corrupted.
// I'll grab everything up to "<tr>\n                                <td colSpan={2} className=\"border border-black p-6\">"
// which is line 652 and restore the correct bottom structure.
const index = code.indexOf('<tr>\n                                <td colSpan={2} className="border border-black p-6">');
if (index === -1) {
  console.log("Could not find anchor.");
  process.exit(1);
}

const goodPart = code.substring(0, index);
const fixedBottom = `<tr>
                                <td colSpan={2} className="border border-black p-6">
                                    <div className="flex justify-end items-end mt-12 mb-8 px-12">
                                        <div className="flex flex-col items-center">
                                            <div className="flex items-end gap-2 text-lg mb-6">
                                                <span>起诉人：</span>
                                                <div className="w-32 border-b-2 border-black"></div>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="w-12 border-b-2 border-black inline-block"></span>年
                                                <span className="w-8 border-b-2 border-black inline-block"></span>月
                                                <span className="w-8 border-b-2 border-black inline-block"></span>日
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
  );
};
export default ComplaintGeneratorView;
`;

fs.writeFileSync('client/components/complaintGenerator/ComplaintGeneratorView.tsx', goodPart + fixedBottom);
console.log("Fixed!");
