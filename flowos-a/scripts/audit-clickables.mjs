import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const roots = ['app', 'components']
const sourceFiles = roots.flatMap((root) => collect(path.resolve(root)))
const issues = []
let buttons = 0
let links = 0
let roleButtons = 0

for (const file of sourceFiles) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

  visit(source, (node) => {
    if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) return

    const tag = node.tagName.getText(source)
    if (tag === 'button') {
      buttons += 1
      const hasClick = hasAttribute(node, 'onClick')
      const submit = attributeText(node, 'type') === 'submit' && hasAncestor(node, 'form')
      if (!hasClick && !submit) report(source, node, '<button> 缺少 onClick，且不是表单提交按钮')
    }

    if (tag === 'Link' || tag === 'a') {
      links += 1
      const href = getAttribute(node, 'href')
      if (!href || isEmptyAttribute(href)) report(source, node, `<${tag}> 缺少有效 href`)
    }

    if (attributeText(node, 'role') === 'button' && tag !== 'button') {
      roleButtons += 1
      if (!hasAttribute(node, 'onClick')) report(source, node, `${tag}[role="button"] 缺少 onClick`)
      if (!hasAttribute(node, 'onKeyDown') || !hasAttribute(node, 'tabIndex')) {
        report(source, node, `${tag}[role="button"] 缺少键盘交互或 tabIndex`)
      }
    }
  })
}

if (issues.length) {
  console.error(`点击面审计失败：发现 ${issues.length} 个问题。`)
  for (const issue of issues) console.error(`- ${issue}`)
  process.exit(1)
}

console.log(`点击面审计通过：${buttons} 个按钮、${links} 个链接、${roleButtons} 个自定义按钮均有有效交互。`)

function collect(directory) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) return collect(target)
    return /\.[jt]sx$/.test(entry.name) ? [target] : []
  })
}

function visit(node, callback) {
  callback(node)
  node.forEachChild((child) => visit(child, callback))
}

function getAttribute(node, name) {
  return node.attributes.properties.find((attribute) => ts.isJsxAttribute(attribute) && attribute.name.text === name)
}

function hasAttribute(node, name) {
  return Boolean(getAttribute(node, name))
}

function attributeText(node, name) {
  const attribute = getAttribute(node, name)
  return attribute && attribute.initializer && ts.isStringLiteral(attribute.initializer) ? attribute.initializer.text : undefined
}

function isEmptyAttribute(attribute) {
  if (!attribute.initializer) return true
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text.trim() === '' || attribute.initializer.text.trim() === '#'
  if (!ts.isJsxExpression(attribute.initializer)) return false
  const expression = attribute.initializer.expression
  return !expression || (ts.isStringLiteral(expression) && expression.text.trim() === '')
}

function hasAncestor(node, tagName) {
  let parent = node.parent
  while (parent) {
    if ((ts.isJsxElement(parent) || ts.isJsxSelfClosingElement(parent)) && parent.openingElement?.tagName?.getText() === tagName) return true
    parent = parent.parent
  }
  return false
}

function report(source, node, message) {
  const position = source.getLineAndCharacterOfPosition(node.getStart(source))
  issues.push(`${path.relative(process.cwd(), source.fileName)}:${position.line + 1}:${position.character + 1} ${message}`)
}
