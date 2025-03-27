export const prompts = {
  GENERATE_AQL_QUERY: (
    collectionName: string,
    sampleDocs: any[],
    userQuery: string,
    descriptions: any[],
    datasetContext: string
  ) => `
      You are an expert in ArangoDB AQL queries, A user has provided a natural language request to retrieve data from a collection. Your task is to generate a valid AQL query based on this request.
      
      ### Collection Name: ${collectionName}
      ### For context,Here are the Sample Documents from a bigger dataset.
      ${JSON.stringify(sampleDocs, null, 2)}
      
      ### For context,Here are Schema Descriptions about key fields:
      ${descriptions && descriptions.length ? JSON.stringify(descriptions, null, 2) : "No schema descriptions available."}
      
      ### Additional Dataset Context:
      ${datasetContext}
      
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
      - Base the query on the user's request, adapting the syntax patterns or examples as needed.
      - Ensure the query is syntactically valid for AQL.
      - Ensure that the predefined functions of sql are not valid in aql, so if you are using any predefined functions make sure they valid in aql.

      ### User Request:
      "${userQuery}"
      
      Return only valid JSON in this format:
      {
        "collection": "${collectionName}",
        "aql_query": "AQL query here",
        "explanation": "Explanation of what the AQL query does in the context of the user request."
      }
      
      **Note**: Do not include any explanations, comments, or additional text beyond the JSON response. And dont return response in code blocks, only expected json.`,
  GENERATE_COLUMN_DESCRIPTIONS: (collectionName: string, company: string, fileDescription: string, promptParts: string[]) => `
      You are given data from the industry "${company}" uploaded in CSV file "${collectionName}". 
      The user provided the following description of the file: "${fileDescription}"

      For each field, use the field name and the first 100 sample values to generate a descriptive explanation of what the field represents.

      ${promptParts.join('\n')}

      Based on the provided information and the user's description, generate a structured JSON response with:
      1. A summary of the overall file, taking into account the user's description.
      2. A description of each column, explaining what it represents.

      Return the response as a valid JSON object in this format:
      {
        "fileSummary": "summary of the overall file",
        "descriptions": [
          { "field": "fieldName", "description": "description of field" },
          { "field": "fieldName", "description": "description of field" }
        ]
      }

      **Note**: Do not include any code blocks, explanations, comments, or additional text beyond the JSON response.
  `,

  IDENTIFY_DATA_TYPES: () => `You are given data from a CSV file. For each field, use the field name and the provided sample values to determine the most appropriate data type. Possible types are: string, integer, float, boolean, date. Do not include any explanations, comments, or additional text beyond the JSON response. And dont return response in code blocks, only expected json. Return the response as a JSON array with objects in this format: [{ "field": "fieldName", "type": "dataType" }]`,

};
