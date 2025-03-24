export const prompts = {
  GENERATE_AQL_QUERY: (
    collectionName: string,
    sampleDocs: any[],
    userQuery: string,
    descriptions: any[]
  ) => `
      You are an expert in ArangoDB AQL queries. A user has provided a natural language request to retrieve data from a collection. Your task is to generate a valid AQL query based on this request.
      
      ### Collection Name: ${collectionName}
      ### For context,Here are the Sample Documents from a bigger dataset.
      ${JSON.stringify(sampleDocs, null, 2)}
      
      ### For context,Here are Schema Descriptions about key fields:
      ${descriptions && descriptions.length ? JSON.stringify(descriptions, null, 2) : "No schema descriptions available."}
      
      **Important**: AQL is the query language for ArangoDB and differs from SQL. Do not use SQL syntax (e.g., SELECT, FROM, WHERE). Instead, use AQL syntax such as FOR, FILTER, RETURN, etc.

      #### AQL Syntax Patterns:
      - To retrieve all documents: FOR doc IN collection RETURN doc
      - To filter documents: FOR doc IN collection FILTER doc.field == value RETURN doc
      - To sort documents: FOR doc IN collection SORT doc.field ASC RETURN doc
      - To limit results: FOR doc IN collection LIMIT 10 RETURN doc

      #### Examples:
      1. Request: "Get all users with age greater than 30"
         AQL: FOR doc IN users FILTER doc.age > 30 RETURN doc
      2. Request: "Get the names of products in category 'electronics'"
         AQL: FOR doc IN products FILTER doc.category == 'electronics' RETURN doc.name
      3. Request: "Get the first 5 orders sorted by date descending"
         AQL: FOR doc IN orders SORT doc.orderDate DESC LIMIT 5 RETURN doc

      #### Rules:
      - Use only field names present in the sample documents (e.g., doc.fieldName).
      - Spell field names exactly as they appear in the sample documents.
      - Handle data types correctly (e.g., strings in single quotes like 'value', numbers without quotes like 123).
      - Base the query on the user’s request, adapting the syntax patterns or examples as needed.
      - Ensure the query is syntactically valid for AQL.

      ### User Request:
      "${userQuery}"
      
      Return only valid JSON in this format:
      {
        "collection": "${collectionName}",
        "aql_query": "AQL query here"
      }
      
      **Note**: Do not include any explanations, comments, or additional text beyond the JSON response. And dont return response in code blocks, only expected json.
  `,

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
    and don't add any additional text or code blocks to the response.`,

  IDENTIFY_DATA_TYPES: () => `You are given data from a CSV file. For each field, use the field name and the provided sample values to determine the most appropriate data type. Possible types are: string, integer, float, boolean, date. Do not include any explanations, comments, or additional text beyond the JSON response. And dont return response in code blocks, only expected json. Return the response as a JSON array with objects in this format: [{ "field": "fieldName", "type": "dataType" }]`
};
