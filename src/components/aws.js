import {hash} from './options';
import aws from 'aws-sdk';
window.global = window;
let accessKey, secretKey, region='eu-west-2', bucket='';
export let s3 = null;
export let hasS3 = false;
const pw = 'choir-practice';
const Bucket = 'choir-scores';

const listObjects = (params) => new Promise((res,rej)=>s3.listObjectsV2(params,(e,d)=>{if(e) rej(e); else res(d)}));

export async function listFiles(regex){
  let list = await listObjects({Bucket});
  let rtn = list.Contents;
  while (list.IsTruncated){
    const {ContinuationToken} = list;
    let list = await listObjects({Bucket, ContinuationToken});
    rtn = rtn.concat(list.Contents);
  }
  if (regex) rtn = rtn.filter(e=>regex.test(e.Key));
  return rtn.map(e=>e.Key);
}

window.listFiles = listFiles;

async function readKeys(){
  if (
    await extractKeys(hash?.storage, true)
    || await extractKeys(localStorage.getItem('storage'))
  ){
    try{
      aws.config.update({
        secretAccessKey:secretKey,
        accessKeyId: accessKey
      })
      s3 = new aws.S3({
        signatureVersion: 'v4',
        region
      })
      window.s3=s3;
      hasS3 = !!s3;
    } catch(e){
      console.log('error with s3',e)
    }
  } else {
    s3=null;
  }
}

async function extractKeys(s, store){
  if(s){
    try {
      const ds = await decryptData(s, pw);
      [accessKey, secretKey] = ds.split(',');
      const OK = !!(accessKey && secretKey);
      if (OK && store){
        localStorage.setItem('storage',s);
      }
      return OK;
    } catch(e){}
  }
}

window.getStorageHash = async function(access,secret){
  console.log('#storage='+await encryptData(access+','+secret,pw));
}

// for large strings, use this from https://stackoverflow.com/a/49124600
const buff_to_base64 = (buff) => btoa(
  new Uint8Array(buff).reduce(
    (data, byte) => data + String.fromCharCode(byte), ''
  )
);

const base64_to_buf = (b64) =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(null));

const enc = new TextEncoder();
const dec = new TextDecoder();


const getPasswordKey = (password) =>
  window.crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveKey",
  ]);

const deriveKey = (passwordKey, salt, keyUsage) =>
  window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 250000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    keyUsage
  );

async function encryptData(secretData, password) {
  try {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const passwordKey = await getPasswordKey(password);
    const aesKey = await deriveKey(passwordKey, salt, ["encrypt"]);
    const encryptedContent = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      aesKey,
      enc.encode(secretData)
    );

    const encryptedContentArr = new Uint8Array(encryptedContent);
    let buff = new Uint8Array(
      salt.byteLength + iv.byteLength + encryptedContentArr.byteLength
    );
    buff.set(salt, 0);
    buff.set(iv, salt.byteLength);
    buff.set(encryptedContentArr, salt.byteLength + iv.byteLength);
    return buff_to_base64(buff);
  } catch (e) {
    console.log(`Error - ${e}`);
    return "";
  }
}

async function decryptData(encryptedData, password) {
  try {
    const encryptedDataBuff = base64_to_buf(encryptedData);
    const salt = encryptedDataBuff.slice(0, 16);
    const iv = encryptedDataBuff.slice(16, 16 + 12);
    const data = encryptedDataBuff.slice(16 + 12);
    const passwordKey = await getPasswordKey(password);
    const aesKey = await deriveKey(passwordKey, salt, ["decrypt"]);
    const decryptedContent = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      aesKey,
      data
    );
    return dec.decode(decryptedContent);
  } catch (e) {
    console.log(`Error - ${e}`);
    return "";
  }
}

readKeys().then();