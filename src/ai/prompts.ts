export const prompts = {
    GENERATE_AQL_QUERY: (collectionName: string, sampleDocs: any[], userQuery: string) => `You are an expert in ArangoDB AQL queries. A user has provided a natural language request to retrieve data from a collection.
            To help you construct the correct query, here are sample documents from the collection:

            ### Collection Name: ${collectionName}
            ### Sample Documents:
            ${JSON.stringify(sampleDocs, null, 2)}

            Now, generate a valid AQL query based on the user’s request, Make sure the syntax of the query is correct.

            ### Rules:
            - Use only field names from the sample documents.
            - Return only valid JSON in this format:
            {
            "collection": "${collectionName}",
            "aql_query": "AQL query here"
            }

            ### User request:
            "${userQuery}"

            Dont add any additional text or code blocks to the response, only return the given json format.`,

    EXTRACT_COLLECTION_NAME: (userQuery: string) => `You are an expert in understanding user queries and extracting the correct database collection name. 
            The user will provide a request that contains a reference to a collection name. 
            Your task is to extract the exact collection name from the request.
            
            ### Rules:
            - The collection name will be a single word or a hyphen/underscore-separated string.
            - Only return the collection name, nothing else.
            - If no collection name is found, return "null".
            
            ### User Request:
            "${userQuery}"
            
            ### Expected Output Format:
            {
            "collection": "extracted_collection_name"
            }

            dont add any additional text or code blocks to the response, only return the collection name in given json format.`,

    GENERATE_COLUMN_DESCRIPTIONS: (filename: string, csvUploadId: string, company: string, promptParts: string[]) => `You are given data from the company "${company}" uploaded in CSV file "${filename}" (ID: "${csvUploadId}"). 
    For each field, use the field name and the first 100 sample values to generate a descriptive explanation of what the field represents. So please analyze what each field is about and write a detailed description.
    
    ${promptParts.join('\n')}
    
    Return the response as a valid JSON array with objects in this format:
    [
      { "field": "fieldName", "description": "description of field" },
      { "field": "fieldName", "description": "description of field" }
    ]
      and don't add any additional text or code blocks to the response.`
};