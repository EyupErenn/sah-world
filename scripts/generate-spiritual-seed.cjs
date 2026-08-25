/* eslint-disable @typescript-eslint/no-require-imports */
// Generates the SQL mirror of the reviewed, typed spiritual content catalogue.
// Run with: node scripts/generate-spiritual-seed.cjs
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const workspace = path.resolve(__dirname, '..')
const sourcePath = path.join(workspace, 'src', 'lib', 'spiritualLibrary.ts')
const outputPath = path.join(workspace, 'supabase', 'migrations', '013_spiritual_library_seed.sql')
const source = fs.readFileSync(sourcePath, 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const moduleBox = { exports: {} }
vm.runInNewContext(`(function (module, exports) { ${compiled}\n})(moduleBox, moduleBox.exports)`, { moduleBox })
const { ASMA_NAMES, DUA_LIBRARY } = moduleBox.exports

const quoted = (value) => `'${String(value).replaceAll("'", "''")}'`
const category = { 'Kuran’dan Dualar': 'quran', 'Hadislerden Dualar': 'hadith', 'Sahabeye Öğretilen Dualar': 'companions' }
const values = DUA_LIBRARY.map((item) => `  (${[
  item.id,
  category[item.category],
  item.occasion,
  item.title,
  item.arabic,
  item.meaning,
  item.source,
  item.sourceUrl,
  item.context,
].map(quoted).join(', ')})`).join(',\n')

const sql = `-- Generated from src/lib/spiritualLibrary.ts. Do not edit by hand.\n` +
`-- Source citations remain part of every row for content auditability.\n\n` +
`INSERT INTO public.dua_library (id, category, occasion, title, arabic_text, turkish_meaning, source_citation, source_url, context_note)\nVALUES\n${values}\n` +
`ON CONFLICT (id) DO UPDATE SET\n` +
`  category = excluded.category, occasion = excluded.occasion, title = excluded.title,\n` +
`  arabic_text = excluded.arabic_text, turkish_meaning = excluded.turkish_meaning,\n` +
`  source_citation = excluded.source_citation, source_url = excluded.source_url, context_note = excluded.context_note;\n`

fs.writeFileSync(outputPath, sql, 'utf8')
console.log(`Generated ${path.relative(workspace, outputPath)} with ${DUA_LIBRARY.length} reviewed entries; Esmâ catalogue count: ${ASMA_NAMES.length}.`)
