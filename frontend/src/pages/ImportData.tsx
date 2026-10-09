import {ChangeEvent,useEffect,useState} from "react";
import {FileSpreadsheet,Download,UploadCloud,CheckCircle2,AlertCircle} from "lucide-react";
import {api} from "../api";

type DatasetKey="expenses"|"income"|"advances"|"parties"|"ads";
type ImportResult={dataset:string;file:string;imported:number};
type Features={imap:{enabled:boolean;message:string};attachments:{enabled:boolean;status:string}};

const datasets:Record<DatasetKey,{label:string;description:string;required:string[]}>={
  expenses:{label:"Expenses",description:"Bills, reimbursements and issue-wise costs.",required:["expense_date","category","total_amount"]},
  income:{label:"Income",description:"Advertising, sponsorship and other revenue.",required:["invoice_date","customer","income_type","invoice_total"]},
  advances:{label:"Advances",description:"Staff advances and reimbursement balances.",required:["person_name","advance_date","amount"]},
  parties:{label:"Parties",description:"Advertisers, vendors, employees and consultants.",required:["party_name"]},
  ads:{label:"Ad Bookings",description:"Bookings, artwork, invoices and publication status.",required:["booking_date","customer","magazine_issue"]}
};

function errorMessage(error:unknown){
  const detail=(error as any)?.response?.data?.detail;
  if(typeof detail==="string") return detail;
  if(detail?.message){
    const rows=(detail.errors||[]).slice(0,5).map((x:any)=>`Row ${x.row}: ${x.errors.join(", ")}`).join(" | ");
    return rows?`${detail.message} ${rows}`:detail.message;
  }
  return "The workbook could not be imported. Check the file and try again.";
}

export default function ImportData(){
  const [dataset,setDataset]=useState<DatasetKey>("expenses");
  const [file,setFile]=useState<File|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [result,setResult]=useState<ImportResult|null>(null);
  const [features,setFeatures]=useState<Features|null>(null);
  const [attachment,setAttachment]=useState<File|null>(null);
  const [attachmentBusy,setAttachmentBusy]=useState(false);
  const [attachmentUrl,setAttachmentUrl]=useState("");
  const [attachmentError,setAttachmentError]=useState("");
  useEffect(()=>{api.get<Features>("/features").then(response=>setFeatures(response.data)).catch(()=>{});},[]);
  const selected=datasets[dataset];

  function selectFile(event:ChangeEvent<HTMLInputElement>){
    setFile(event.target.files?.[0]||null);setMessage("");setError("");setResult(null);
  }
  async function downloadTemplate(){
    setError("");
    try{
      const response=await api.get(`/imports/${dataset}/template`,{responseType:"blob"});
      const url=URL.createObjectURL(response.data);const link=document.createElement("a");link.href=url;link.download=`orozone_${dataset}_import_template.xlsx`;link.click();URL.revokeObjectURL(url);
    }catch(error){setError(errorMessage(error));}
  }
  async function submit(){
    if(!file){setError("Choose an Excel workbook first.");return;}
    setBusy(true);setError("");setMessage("");setResult(null);
    try{
      const body=new FormData();body.append("file",file);
      const response=await api.post(`/imports/${dataset}`,body,{headers:{"Content-Type":"multipart/form-data"}});
      setResult(response.data);setMessage(`Imported ${response.data.imported} ${selected.label.toLowerCase()} record${response.data.imported===1?"":"s"}.`);setFile(null);
    }catch(error){setError(errorMessage(error));}
    finally{setBusy(false);}
  }
  async function uploadAttachment(){
    if(!attachment||!features?.attachments.enabled)return;
    setAttachmentBusy(true);setAttachmentError("");setAttachmentUrl("");
    try{
      const body=new FormData();body.append("file",attachment);
      const response=await api.post<{url:string}>("/attachments",body,{headers:{"Content-Type":"multipart/form-data"}});
      setAttachmentUrl(response.data.url);setAttachment(null);
    }catch(error){setAttachmentError((error as any)?.response?.data?.detail||"The attachment could not be uploaded. Try again.");}
    finally{setAttachmentBusy(false);}
  }

  return <>
    <div className="page-title"><div><h2>Import from Excel</h2><p>Load existing finance records into OROZONE using an Excel workbook.</p></div></div>
    <div className="import-layout">
      <section className="card import-card">
        <div className="import-heading"><div className="import-icon"><FileSpreadsheet size={22}/></div><div><h3>Choose what to import</h3><p>Each dataset has its own template and validation rules.</p></div></div>
        <label>Dataset<select value={dataset} onChange={event=>{setDataset(event.target.value as DatasetKey);setFile(null);setMessage("");setError("");setResult(null);}}>{Object.entries(datasets).map(([key,item])=><option key={key} value={key}>{item.label}</option>)}</select></label>
        <div className="import-dataset-note"><strong>{selected.label}</strong><span>{selected.description}</span></div>
        <div className="required-fields"><span>Required columns</span><div>{selected.required.map(column=><code key={column}>{column}</code>)}</div></div>
        <button type="button" className="secondary" onClick={downloadTemplate}><Download size={17}/> Download Excel template</button>
      </section>
      <section className="card import-card">
        <div className="import-heading"><div className="import-icon"><UploadCloud size={22}/></div><div><h3>Upload workbook</h3><p>Use the first worksheet in an .xlsx or .xlsm file.</p></div></div>
        <label className="upload-dropzone"><input type="file" accept=".xlsx,.xlsm" onChange={selectFile}/><span>{file?file.name:"Choose an Excel file"}</span><small>{file?`${(file.size/1024).toFixed(1)} KB selected`:`Click to browse or drop a workbook here`}</small></label>
        <button type="button" className="primary import-submit" disabled={busy||!file} onClick={submit}>{busy?"Importing...":"Import records"}</button>
        {message&&<div className="import-alert success"><CheckCircle2 size={18}/>{message}</div>}
        {error&&<div className="import-alert error"><AlertCircle size={18}/><span>{error}</span></div>}
      </section>
    </div>
    <section className="card import-help"><h3>Before you upload</h3><p>Keep the column names from the template, use one record per row, and make sure required dates and amounts are filled in. The import is all-or-nothing, so a workbook with validation errors will not create partial records.</p></section>
    {features&&<section className="card import-help"><h3>Additional import options</h3><p><strong>Mailbox import:</strong> {features.imap.message}</p><p><strong>Attachments:</strong> {features.attachments.enabled?"Upload a bill or supporting document, then copy its link into the record's bill reference or remarks.":"Waiting for R2 activation. Excel record imports remain available."}</p><label>Supporting document<input type="file" disabled={!features.attachments.enabled||attachmentBusy} onChange={event=>{setAttachment(event.target.files?.[0]||null);setAttachmentUrl("");setAttachmentError("");}}/></label><button type="button" className="secondary" disabled={!features.attachments.enabled||!attachment||attachmentBusy} onClick={uploadAttachment}>{attachmentBusy?"Uploading...":features.attachments.enabled?"Upload attachment":"Attachments pending R2"}</button>{attachmentUrl&&<p><a href={attachmentUrl} target="_blank" rel="noreferrer">Open uploaded attachment</a><br/><code>{attachmentUrl}</code></p>}{attachmentError&&<div className="import-alert error"><AlertCircle size={18}/><span>{attachmentError}</span></div>}</section>}
  </>;
}
