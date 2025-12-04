import crypto from 'crypto';

export interface WhoisData {
  domainName?: string;
  registrar?: string;
  creationDate?: string;
  expirationDate?: string;
  registrantName?: string;
  registrantOrganization?: string;
  registrantEmail?: string;
  nameServers?: string[];
  status?: string[];
  [key: string]: unknown;
}

export async function fetchWhoisData(domain: string): Promise<WhoisData> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { whoisDomain } = require('whoiser');
    const result = await whoisDomain(domain, { follow: 2, timeout: 10000 });
    
    // whoiser returns an object with server keys, get the first relevant one
    const whoisData = typeof result === 'object' && result !== null 
      ? Object.values(result)[0] as Record<string, unknown>
      : {};
    
    // Normalize the data structure
    const normalized: WhoisData = {
      domainName: domain,
      registrar: whoisData['Registrar'] as string || whoisData['registrar'] as string,
      creationDate: whoisData['Creation Date'] as string || whoisData['created'] as string || whoisData['createdDate'] as string,
      expirationDate: whoisData['Registry Expiry Date'] as string || whoisData['expires'] as string || whoisData['expirationDate'] as string,
      registrantName: whoisData['Registrant Name'] as string || whoisData['registrant'] as string,
      registrantOrganization: whoisData['Registrant Organization'] as string || whoisData['org'] as string,
      registrantEmail: whoisData['Registrant Email'] as string,
      nameServers: (whoisData['Name Server'] as string[]) || (whoisData['nameservers'] as string[]) || [],
      status: (whoisData['Domain Status'] as string[]) || (whoisData['status'] as string[]) || [],
      ...whoisData,
    };
    
    return normalized;
  } catch (error) {
    throw new Error(`Failed to fetch WHOIS data for ${domain}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function hashWhoisData(data: WhoisData): string {
  // Create a copy and exclude fields that change frequently but aren't meaningful
  const dataToHash = { ...data };
  
  // Remove fields that update frequently but don't indicate real changes
  // Using regex patterns to match various forms
  const ignoredPatterns = [
    /last update/i,
    /updated date/i,
    /updated/i,
    /last updated/i,
    /last transferred/i,
    /registry database/i,
    /whois database/i,
  ];
  
  Object.keys(dataToHash).forEach(field => {
    if (ignoredPatterns.some(pattern => pattern.test(field))) {
      delete dataToHash[field];
    }
  });
  
  // Create a normalized string representation of the WHOIS data
  const normalized = JSON.stringify(dataToHash, Object.keys(dataToHash).sort());
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function compareWhoisData(oldData: WhoisData, newData: WhoisData): string[] {
  const changes: string[] = [];
  
  // Fields to ignore when comparing using regex patterns
  const ignoredPatterns = [
    /last update/i,
    /updated date/i,
    /updated/i,
    /last updated/i,
    /last transferred/i,
    /registry database/i,
    /whois database/i,
  ];
  
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  
  for (const key of allKeys) {
    // Skip ignored fields using regex patterns
    if (ignoredPatterns.some(pattern => pattern.test(key))) {
      continue;
    }
    
    const oldValue = JSON.stringify(oldData[key]);
    const newValue = JSON.stringify(newData[key]);
    
    if (oldValue !== newValue) {
      if (oldData[key] === undefined) {
        changes.push(`${key}: Added - ${newValue}`);
      } else if (newData[key] === undefined) {
        changes.push(`${key}: Removed - ${oldValue}`);
      } else {
        changes.push(`${key}: Changed from ${oldValue} to ${newValue}`);
      }
    }
  }
  
  return changes;
}
