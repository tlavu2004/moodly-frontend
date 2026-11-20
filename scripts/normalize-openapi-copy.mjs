import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const outputPath = process.argv[2]

// Match the generator's prose without replacing text from the API contract.
const replacementsByFile = {
  'client.api.ts': [["if you're using Next.js", 'if you are using Next.js']],
  'client/types.api.ts': [
    ["Please don't use the Fetch client", 'Please do not use the Fetch client'],
    ["options won't have any effect", 'options will not have any effect'],
    ["if you don't want to parse response data", 'if you do not want to parse response data'],
    ["if you're using Next.js", 'if you are using Next.js'],
  ],
  'core/params.api.ts': [["Key isn't required for bodies", 'Key is not required for bodies']],
  'core/pathSerializer.api.ts': [
    ['Deeply-nested arrays/objects aren’t supported', 'Deeply-nested arrays/objects are not supported'],
  ],
  'core/types.api.ts': [["response data before it's returned", 'response data before it is returned']],
  'sdk.api.ts': [["values that aren't defined as part of the SDK", 'values that are not defined as part of the SDK']],
}

for (const [file, replacements] of Object.entries(replacementsByFile)) {
  const path = join(outputPath, file)
  const original = readFileSync(path, 'utf8')
  let updated = original

  for (const [before, after] of replacements) {
    updated = updated.replaceAll(before, after)
  }

  if (updated !== original) writeFileSync(path, updated)
}
