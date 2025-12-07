// use that script at root level by calling yarn translate
import { locales } from './locale'
import i18n from './i18n.json' assert { type: "json" }
import fs from 'fs'
import api from '@google-cloud/translate'
const { Translate } = api.v2

const translate = new Translate()

async function translateText() {
  try {
    // translating from English the missing translations only
    const temp: Promise<[string, any]>[] = []
    i18n.forEach((line, index) => {
      const text = line['en']
      if (!text || typeof text !== 'string') {
        throw ('No english text in the line')
      }
      locales.forEach(async locale => {
        const existingTranslation = line[locale]
        if (!existingTranslation) {
          const prom = translate.translate(text, locale)
          temp.push(prom)
          const translation = await prom
          i18n[index][locale] = translation[0]
        }
      })
    })
    await Promise.all(temp)    
    // rewriting the json file
    const file = fs.createWriteStream('./src/i18n/i18n.json')
    file.write("[\n")
    i18n.forEach((line, index) => {
      const text = line['en']
      let newline = `  {`
      locales.forEach(locale => {
        if (locale === 'en') {
          newline += `"en": "${line[locale]}"`
        } else {
          newline += `, "${locale}": "${line[locale]}"`
        }
      })
      if (index === (i18n.length - 1)) {
        newline += '}\n'
      } else {
        newline += '},\n'
      }
      file.write(newline)
    })
    file.write(']')
    file.end()
  } catch (error) {
    console.log('Translation went wrong: ', error)
  }
}

translateText()

export default translateText