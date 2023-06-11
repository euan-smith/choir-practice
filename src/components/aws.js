import {hash} from './options';
import { S3Client, ListObjectsV2Command} from "@aws-sdk/client-s3";
import {encryptData, decryptData} from "./encrypt";

window.global = window;
let accessKey, secretKey;
export let s3 = null;
export let hasS3 = false;
const pw = 'choir-practice';
const Bucket = 'choir-scores';
const region='eu-west-2';

export async function listFiles(regex){
  let list = await s3.send(new ListObjectsV2Command({Bucket}));
  let rtn = list.Contents;
  while (list.IsTruncated){
    const {ContinuationToken} = list;
    list = await s3.send(new ListObjectsV2Command({Bucket, ContinuationToken}));
    rtn = rtn.concat(list.Contents);
  }
  if (regex) rtn = rtn.filter(e=>regex.test(e.Key));
  return rtn.map(e=>e.Key);
}

window.listFiles = listFiles;

async function readKeys(){
  if (
    await extractKeys(hash?.storage, 'storage')
  ){
    try{
      s3 = new S3Client({
        region,
        credentials:{
          accessKeyId: accessKey,
          secretAccessKey: secretKey
        }
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

/**
 * If supplied with a string will try and decrypt a key set from it and if successful store those keys in local storage
 * otherwise it will attempt to extract from local storage.  Returns true if either is successful.
 * @param packedKeys {string?} encrypted key bundle or falsy if there is none
 * @param store {string} the name of the local storage key to use
 * @returns {Promise<boolean>} resolves to true of S3 keys were set
 */
async function extractKeys(packedKeys, store){
  if (packedKeys && await extractAndCheck(packedKeys)){
    if (store){
      localStorage.setItem(store,packedKeys);
    }
  } else if (store) {
    return extractAndCheck(localStorage.getItem(store))
  }
}

/**
 * Tries to extract and set the keys for S3 access
 * @param packedKeys {string?} encrypted key bundle
 * @returns {Promise<boolean>} resolves to true if extraction is successful
 */
async function extractAndCheck(packedKeys){
  if (packedKeys){
    try {
      const ds = await decryptData(packedKeys, pw);
      [accessKey, secretKey] = ds.split(',');
      return !!(accessKey && secretKey);
    } catch(e){ }
  }
  return false;
}

window.getStorageHash = async function(access,secret){
  console.log('#storage='+await encryptData(access+','+secret,pw));
}

readKeys().then();