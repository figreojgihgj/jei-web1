import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

const COLOR_MAP = {
  light_text_primary: '#1f1f1f',
  light_text_secondary: '#5f5f5f',
  light_text_tertiary: '#8f8f8f',
  light_text_quaternary: '#afafaf',
  light_function_blue: '#1976d2',
  light_function_blueness: '#2196f3',
  light_function_red: '#e53935',
  light_function_green: '#43a047',
  light_function_yellow: '#f9a825',
  light_rank_blue: '#42a5f5',
  light_rank_yellow: '#ffa726',
  light_rank_orange: '#fb8c00',
  light_rank_purple: '#8e24aa',
  light_rank_gray: '#9e9e9e',
};

function parseArgs(argv) {
  const args = {
    input: '',
    out: 'temp/info',
    mdOut: 'temp/md',
    catalog: '',
    defaultColor: '',
  };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const next = argv[i + 1];
    if (key === '--input' && next) {
      args.input = next;
      i += 1;
    } else if (key === '--out' && next) {
      args.out = next;
      i += 1;
    } else if (key === '--md-out' && next) {
      args.mdOut = next;
      i += 1;
    } else if (key === '--catalog' && next) {
      args.catalog = next;
      i += 1;
    } else if (key === '--default-color' && next) {
      args.defaultColor = next;
      i += 1;
    }
  }
  return args;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function writeText(filePath, text) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, text.endsWith('\n') ? text : `${text}\n`, 'utf8');
}

function buildCatalogItemMap(data) {
  const map = {};
  const catalogList = data?.data?.catalog || [];

  catalogList.forEach((category) => {
    category.typeSub?.forEach((subType) => {
      subType.items?.forEach((item) => {
        const name = item.name || item.brief?.name || item.itemId;
        map[String(item.itemId)] = {
          itemId: item.itemId,
          name,
          cover: item.brief?.cover || '',
        };
      });
    });
  });

  return map;
}

function loadCatalogMap(catalogPath) {
  if (!catalogPath) return {};
  const fullPath = path.resolve(repoRoot, catalogPath);
  if (!fs.existsSync(fullPath)) return {};
  try {
    const data = readJson(fullPath);
    return buildCatalogItemMap(data);
  } catch {
    return {};
  }
}

const catalogMap = { value: {} };
const defaultColor = { value: '' };

function listFiles(inputPath) {
  const full = path.resolve(repoRoot, inputPath);
  const stat = fs.statSync(full);
  if (stat.isFile()) return [full];
  const out = [];
  const stack = [full];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(abs);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (ext !== '.json' && ext !== '.md') continue;
      if (entry.name.toLowerCase() === 'index.json') continue;
      out.push(abs);
    }
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

function makeId(prefix = 'b') {
  return `${prefix}${Math.random().toString(36).slice(2, 10)}`;
}

function getFirstDocument(wikiData) {
  const docMap = wikiData?.data?.item?.document?.documentMap;
  if (!docMap) return null;
  const firstKey = Object.keys(docMap)[0];
  return firstKey ? docMap[firstKey] : null;
}

function inlineToText(inline) {
  if (!inline) return '';
  if (inline.kind === 'text') return inline.text?.text || '';
  if (inline.kind === 'entry') {
    const id = inline.entry?.id || '';
    const count = inline.entry?.count && inline.entry.count !== '0' ? `×${inline.entry.count}` : '';
    return `entry:${id}${count}`;
  }
  return '';
}

function blockToPlainText(block, blockMap) {
  if (!block) return '';
  if (block.kind === 'text') {
    return (block.text?.inlineElements || []).map(inlineToText).join('');
  }
  if (block.kind === 'list') {
    return (block.list?.itemIds || [])
      .map((id) => block.list.itemMap?.[id]?.childIds || [])
      .flat()
      .map((childId) => blockToPlainText(blockMap[childId], blockMap))
      .join(' ');
  }
  if (block.kind === 'quote') {
    return (block.quote?.childIds || [])
      .map((childId) => blockToPlainText(blockMap[childId], blockMap))
      .join(' ');
  }
  if (block.kind === 'table') {
    const rowIds = block.table?.rowIds || [];
    const colIds = block.table?.columnIds || [];
    const cellTexts = [];
    rowIds.forEach((rowId) => {
      colIds.forEach((colId) => {
        const cell = block.table.cellMap?.[`${rowId}_${colId}`];
        const childIds = cell?.childIds || [];
        const cellText = childIds.map((id) => blockToPlainText(blockMap[id], blockMap)).join(' ');
        if (cellText) cellTexts.push(cellText);
      });
    });
    return cellTexts.join(' ');
  }
  return '';
}

function inlineToMarkdown(inline, defaultColorValue = '') {
  if (!inline) return '';
  if (inline.kind === 'entry') {
    const id = inline.entry?.id || '';
    const showType = inline.entry?.showType || '';
    const count = inline.entry?.count || '';
    const direct = catalogMap.value[String(id)];
    const numericKey = String(Number(id));
    const fallback = catalogMap.value[numericKey];
    const entryInfo = direct || fallback || {};
    const name = entryInfo.name || '';
    const cover = entryInfo.cover || '';
    const nameAttr = name ? ` name=${name}` : '';
    const coverAttr = cover ? ` cover=${cover}` : '';
    return `[[entry id=${id} showType=${showType} count=${count}${nameAttr}${coverAttr}]]`;
  }
  const text = inline.text?.text || '';
  const styledText = inline.underline ? `<u>${text}</u>` : text;
  const resolvedColor = inline.color ? (COLOR_MAP[inline.color] || inline.color) : '';
  const isDefaultColor = inline.color && defaultColorValue
    ? (inline.color === defaultColorValue || resolvedColor === defaultColorValue)
    : false;
  const colorText = inline.color && !isDefaultColor
    ? `<span data-color="${inline.color}" style="color: ${resolvedColor}">${styledText}</span>`
    : styledText;
  const bold = inline.bold ? `**${colorText}**` : colorText;
  const italic = inline.italic ? `*${bold}*` : bold;
  const strike = inline.strikethrough ? `~~${italic}~~` : italic;
  const code = inline.code ? `\`${text}\`` : strike;
  return code;
}

function textBlockToMarkdown(block) {
  const content = (block.text?.inlineElements || [])
    .map((inline) => inlineToMarkdown(inline, defaultColor.value))
    .join('');
  const kind = block.text?.kind || 'body';
  if (kind.startsWith('heading')) {
    const level = Number(kind.replace('heading', '')) || 1;
    return `${'#'.repeat(Math.min(6, Math.max(1, level)))} ${content}`;
  }
  if (kind === 'title') return `# ${content}`;
  if (kind === 'subtitle') return `## ${content}`;
  if (kind === 'caption') return `> ${content}`;
  return content;
}

function listBlockToMarkdown(block, blockMap, indent = 0) {
  const isOrdered = block.list?.kind === 'ordered';
  const lines = [];
  const itemIds = block.list?.itemIds || [];
  itemIds.forEach((itemId, idx) => {
    const item = block.list.itemMap?.[itemId];
    const prefix = isOrdered ? `${idx + 1}. ` : '- ';
    const pad = '  '.repeat(indent);
    const childIds = item?.childIds || [];
    const childBlocks = childIds
      .map((childId) => blockMap[childId])
      .filter(Boolean);

    const childLines = [];
    childBlocks.forEach((child) => {
      if (child.kind === 'list') {
        childLines.push(...listBlockToMarkdown(child, blockMap, indent + 1));
      } else if (child.kind === 'text') {
        childLines.push(textBlockToMarkdown(child));
      } else if (child.kind === 'quote') {
        childLines.push(...quoteBlockToMarkdown(child, blockMap));
      } else if (child.kind === 'table') {
        childLines.push(...tableBlockToMarkdown(child, blockMap));
      } else if (child.kind === 'image') {
        const alt = child.image?.description || '';
        const url = child.image?.url || '';
        childLines.push(`![${alt}](${url})`);
      } else if (child.kind === 'horizontalLine') {
        childLines.push('---');
      } else {
        childLines.push(blockToPlainText(child, blockMap));
      }
    });

    if (!childLines.length) {
      lines.push(`${pad}${prefix}`.trimEnd());
      return;
    }

    const [first, ...rest] = childLines;
    lines.push(`${pad}${prefix}${first}`.trimEnd());
    rest.forEach((line) => {
      const extraPad = '  '.repeat(indent + 1);
      lines.push(`${extraPad}${line}`.trimEnd());
    });
  });
  return lines;
}

function tableBlockToMarkdown(block, blockMap) {
  const rowIds = block.table?.rowIds || [];
  const colIds = block.table?.columnIds || [];
  if (!rowIds.length || !colIds.length) return [];

  const blockToInlineMarkdown = (childBlock) => {
    if (!childBlock) return '';
    if (childBlock.kind === 'text') {
      return (childBlock.text?.inlineElements || [])
        .map((inline) => inlineToMarkdown(inline, defaultColor.value))
        .join('');
    }
    return blockToPlainText(childBlock, blockMap);
  };

  const rows = rowIds.map((rowId) =>
    colIds.map((colId) => {
      const cell = block.table.cellMap?.[`${rowId}_${colId}`];
      const childIds = cell?.childIds || [];
      const cellText = childIds
        .map((id) => blockToInlineMarkdown(blockMap[id]))
        .join(' ')
        .trim();
      return cellText || '';
    }),
  );

  const hasColHeader = Boolean(block.table?.colHeader);
  const hasRowHeader = Boolean(block.table?.rowHeader);
  const header = hasColHeader ? rows[0] : colIds.map((_, i) => `Col ${i + 1}`);
  const sep = header.map(() => '---');
  const lines = [];
  lines.push(`| ${header.join(' | ')} |`);
  lines.push(`| ${sep.join(' | ')} |`);
  const start = hasColHeader ? 1 : 0;
  for (let i = start; i < rows.length; i += 1) {
    const row = rows[i];
    const formatted = hasRowHeader && row.length
      ? [`**${row[0]}**`, ...row.slice(1)]
      : row;
    lines.push(`| ${formatted.join(' | ')} |`);
  }
  return lines;
}

function quoteBlockToMarkdown(block, blockMap) {
  const lines = [];
  const childIds = block.quote?.childIds || [];
  childIds.forEach((id) => {
    const child = blockMap[id];
    if (!child) return;
    if (child.kind === 'text') lines.push(`> ${textBlockToMarkdown(child)}`);
    else if (child.kind === 'list') {
      listBlockToMarkdown(child, blockMap).forEach((line) => lines.push(`> ${line}`));
    } else if (child.kind === 'table') {
      tableBlockToMarkdown(child, blockMap).forEach((line) => lines.push(`> ${line}`));
    } else if (child.kind === 'image') {
      const alt = child.image?.description || '';
      const url = child.image?.url || '';
      lines.push(`> ![${alt}](${url})`);
    } else {
      lines.push(`> ${blockToPlainText(child, blockMap)}`);
    }
  });
  return lines;
}

function getDocumentTitle(doc, fallback) {
  for (const blockId of doc.blockIds || []) {
    const block = doc.blockMap?.[blockId];
    if (block?.kind === 'text') {
      const kind = block.text?.kind || '';
      if (kind.startsWith('heading') || kind === 'title' || kind === 'subtitle') {
        const text = (block.text.inlineElements || [])
          .filter((el) => el.kind === 'text')
          .map((el) => el.text.text)
          .join('')
          .trim();
        if (text) return text;
      }
    }
  }
  return fallback;
}

function renderDocument(doc) {
  const lines = [];
  for (const id of doc.blockIds || []) {
    const block = doc.blockMap?.[id];
    if (!block) continue;
    if (block.kind === 'text') lines.push(textBlockToMarkdown(block));
    if (block.kind === 'list') lines.push(...listBlockToMarkdown(block, doc.blockMap));
    if (block.kind === 'table') lines.push(...tableBlockToMarkdown(block, doc.blockMap));
    if (block.kind === 'image') {
      const alt = block.image?.description || '';
      const url = block.image?.url || '';
      lines.push(`![${alt}](${url})`);
    }
    if (block.kind === 'quote') lines.push(...quoteBlockToMarkdown(block, doc.blockMap));
    if (block.kind === 'horizontalLine') lines.push('---');
    lines.push('');
  }
  return lines.join('\n').trim();
}

function encodeMeta(data) {
  const json = JSON.stringify(data || {});
  return Buffer.from(json, 'utf8').toString('base64');
}

function renderWidgetTable(widgetCommon) {
  const rows = widgetCommon?.tableList || [];
  if (!rows.length) return '';
  const lines = [];
  lines.push('| 字段 | 值 |');
  lines.push('| --- | --- |');
  rows.forEach((row) => {
    lines.push(`| ${row.label || ''} | ${row.value || ''} |`);
  });
  return lines.join('\n');
}

function buildWidgetPanels(widgetCommon, documentMap) {
  if (!widgetCommon) return [];
  const tabs = widgetCommon.tabList || [];
  const tabDataMap = widgetCommon.tabDataMap || {};
  const panels = [];

  if (tabs.length) {
    tabs.forEach((tab, index) => {
      const data = tabDataMap[tab.tabId];
      const title = tab.title || data?.intro?.name || data?.intro?.type || `Tab ${index + 1}`;
      panels.push({
        key: tab.tabId,
        title,
        icon: tab.icon || '',
        intro: data?.intro || null,
        document: data?.content ? documentMap?.[data.content] || null : null,
        documentId: data?.content || '',
        introDescriptionId: data?.intro?.description || '',
      });
    });
    return panels;
  }

  Object.keys(tabDataMap).forEach((key, index) => {
    const data = tabDataMap[key];
    const title = data?.intro?.name || data?.intro?.type || `Tab ${index + 1}`;
    panels.push({
      key,
      title,
      icon: '',
      intro: data?.intro || null,
      document: data?.content ? documentMap?.[data.content] || null : null,
      documentId: data?.content || '',
      introDescriptionId: data?.intro?.description || '',
    });
  });
  return panels;
}

function wikiToMarkdown(wikiData) {
  const item = wikiData?.data?.item;
  if (!item) return '';

  const documentMap = item.document?.documentMap || {};
  const chapterGroup = item.document?.chapterGroup || [];
  const widgetCommonMap = item.document?.widgetCommonMap || {};
  const extraInfo = item.document?.extraInfo || {};
  const brief = item.brief || {};

  const meta = {
    itemId: item.itemId,
    name: item.name || '',
    mainType: item.mainType || null,
    subType: item.subType || null,
    brief: {
      cover: brief.cover || '',
      name: brief.name || '',
      associate: brief.associate || null,
      subTypeList: brief.subTypeList || [],
      composite: brief.composite || null,
    },
    caption: item.caption || [],
    document: {
      chapterGroup,
      widgetCommonMap,
      extraInfo,
    },
  };

  const lines = [];
  lines.push(`<!-- wiki:meta ${encodeMeta(meta)} -->`);
  lines.push('');

  const title = brief.name || item.name || item.itemId || '未命名条目';
  lines.push(`# ${title}`);
  lines.push('');

  if (brief.cover) {
    lines.push(`![封面](${brief.cover})`);
    lines.push('');
  }

  if (extraInfo.illustration) {
    lines.push(`![插画](${extraInfo.illustration})`);
    lines.push('');
  }

  if (brief.description && typeof brief.description === 'object') {
    lines.push('## 简介');
    lines.push('');
    lines.push('<!-- wiki:brief-description -->');
    lines.push(renderDocument(brief.description));
    lines.push('<!-- /wiki:brief-description -->');
    lines.push('');
  } else if (item.caption?.length) {
    lines.push('## 简介');
    lines.push('');
    item.caption.forEach((cap) => {
      const text = cap?.text?.text || '';
      if (text) lines.push(text);
    });
    lines.push('');
  }

  if (chapterGroup.length) {
    chapterGroup.forEach((group) => {
      lines.push(`## ${group.title || '未命名章节'}`);
      lines.push('');

      (group.widgets || []).forEach((widget) => {
        lines.push(`### ${widget.title || '未命名组件'}`);
        lines.push('');

        const widgetCommon = widgetCommonMap[widget.id];
        if (!widgetCommon) {
          lines.push('_未找到组件数据_');
          lines.push('');
          return;
        }

        if (widgetCommon.type === 'table') {
          const tableMarkdown = renderWidgetTable(widgetCommon);
          if (tableMarkdown) lines.push(tableMarkdown);
          lines.push('');
          return;
        }

        const panels = buildWidgetPanels(widgetCommon, documentMap);
        if (!panels.length) {
          lines.push('_空面板_');
          lines.push('');
          return;
        }

        panels.forEach((panel) => {
          lines.push(`#### ${panel.title || '面板'}`);
          lines.push('');

          if (panel.icon) {
            lines.push(`![图标](${panel.icon})`);
            lines.push('');
          }

          if (panel.intro) {
            lines.push(`**${panel.intro.name || ''}** ${panel.intro.type ? `(${panel.intro.type})` : ''}`.trim());
            if (panel.intro.imgUrl) {
              lines.push('');
              lines.push(`![介绍图](${panel.intro.imgUrl})`);
            }
            lines.push('');

            if (panel.introDescriptionId && documentMap[panel.introDescriptionId]) {
              lines.push('<!-- wiki:doc ' + panel.introDescriptionId + ' -->');
              lines.push(renderDocument(documentMap[panel.introDescriptionId]));
              lines.push('<!-- /wiki:doc -->');
              lines.push('');
            }
          }

          if (panel.document && panel.documentId) {
            lines.push('<!-- wiki:doc ' + panel.documentId + ' -->');
            lines.push(renderDocument(panel.document));
            lines.push('<!-- /wiki:doc -->');
            lines.push('');
          }
        });
      });
    });
  } else {
    Object.entries(documentMap).forEach(([docId, doc]) => {
      const docTitle = getDocumentTitle(doc, docId);
      lines.push(`## ${docTitle}`);
      lines.push('');
      lines.push(`<!-- wiki:doc ${docId} -->`);
      lines.push(renderDocument(doc));
      lines.push('<!-- /wiki:doc -->');
      lines.push('');
    });
  }

  return lines.join('\n').trim();
}

function buildTextBlock(text, kind = 'body') {
  return {
    id: makeId('t'),
    parentId: 'document-id',
    kind: 'text',
    align: 'left',
    text: {
      inlineElements: text
        ? [{
            kind: 'text',
            text: { text },
          }]
        : [],
      kind,
    },
  };
}

function parseTextWithMarkers(text, baseStyle) {
  const out = [];
  const underlineStack = [];
  const colorStack = [];

  const pushText = (value) => {
    if (!value) return;
    const style = {
      ...baseStyle,
      underline: underlineStack.length ? true : undefined,
      color: colorStack.length ? colorStack[colorStack.length - 1] : undefined,
    };
    out.push({
      kind: 'text',
      text: { text: value },
      ...style,
    });
  };

  let index = 0;
  while (index < text.length) {
    const nextMarker = text.indexOf('[[', index);
    const nextTag = text.indexOf('<', index);
    let start = nextMarker;
    let mode = 'marker';
    if (nextTag !== -1 && (nextMarker === -1 || nextTag < nextMarker)) {
      start = nextTag;
      mode = 'tag';
    }

    if (start === -1) {
      pushText(text.slice(index));
      break;
    }

    if (start > index) {
      pushText(text.slice(index, start));
    }

    if (mode === 'marker') {
      const end = text.indexOf(']]', start + 2);
      if (end === -1) {
        pushText(text.slice(start));
        break;
      }
      const content = text.slice(start + 2, end).trim();
      if (content === 'u') {
        underlineStack.push(true);
      } else if (content === '/u') {
        underlineStack.pop();
      } else if (content.startsWith('color=')) {
        colorStack.push(content.replace('color=', '').trim());
      } else if (content === '/color') {
        colorStack.pop();
      } else if (content.startsWith('entry')) {
        const attrs = content.replace('entry', '').trim();
        const attrMap = {};
        attrs.split(/\s+/).forEach((pair) => {
          const [key, value] = pair.split('=');
          if (!key) return;
          attrMap[key] = value || '';
        });
        out.push({
          kind: 'entry',
          entry: {
            id: attrMap.id || '',
            showType: attrMap.showType || 'link-imgText',
            count: attrMap.count || '',
          },
        });
      } else {
        pushText(`[[${content}]]`);
      }
      index = end + 2;
      continue;
    }

    const tagEnd = text.indexOf('>', start + 1);
    if (tagEnd === -1) {
      pushText(text.slice(start));
      break;
    }
    const tagContent = text.slice(start + 1, tagEnd).trim();
    if (tagContent.startsWith('span') && tagContent.includes('data-color')) {
      const dataColorMatch = tagContent.match(/data-color\s*=\s*"([^"]+)"/);
      if (dataColorMatch?.[1]) {
        colorStack.push(dataColorMatch[1]);
      } else {
        const styleMatch = tagContent.match(/color\s*:\s*([^;\"]+)/);
        if (styleMatch?.[1]) colorStack.push(styleMatch[1].trim());
      }
    } else if (tagContent.startsWith('span') && tagContent.includes('color')) {
      const styleMatch = tagContent.match(/color\s*:\s*([^;\"]+)/);
      if (styleMatch?.[1]) colorStack.push(styleMatch[1].trim());
    } else if (tagContent.startsWith('/span')) {
      colorStack.pop();
    } else if (tagContent === 'u') {
      underlineStack.push(true);
    } else if (tagContent === '/u') {
      underlineStack.pop();
    } else {
      pushText(`<${tagContent}>`);
    }
    index = tagEnd + 1;
  }
  return out;
}

function parseInlineTokens(tokens) {
  const out = [];
  const styleStack = [];
  const pushText = (text) => {
    if (!text) return;
    const baseStyle = {
      bold: styleStack.includes('bold') || undefined,
      italic: styleStack.includes('italic') || undefined,
      strikethrough: styleStack.includes('strike') || undefined,
      code: styleStack.includes('code') || undefined,
    };
    out.push(...parseTextWithMarkers(text, baseStyle));
  };

  for (const token of tokens) {
    if (token.type === 'text') {
      pushText(token.content);
    } else if (token.type === 'strong_open') {
      styleStack.push('bold');
    } else if (token.type === 'strong_close') {
      styleStack.splice(styleStack.lastIndexOf('bold'), 1);
    } else if (token.type === 'em_open') {
      styleStack.push('italic');
    } else if (token.type === 'em_close') {
      styleStack.splice(styleStack.lastIndexOf('italic'), 1);
    } else if (token.type === 's_open') {
      styleStack.push('strike');
    } else if (token.type === 's_close') {
      styleStack.splice(styleStack.lastIndexOf('strike'), 1);
    } else if (token.type === 'code_inline') {
      styleStack.push('code');
      pushText(token.content);
      styleStack.splice(styleStack.lastIndexOf('code'), 1);
    } else if (token.type === 'softbreak' || token.type === 'hardbreak') {
      pushText('\n');
    }
  }
  return out;
}

function markdownToDocument(markdown) {
  const tokens = md.parse(markdown, {});
  const blockMap = {};
  const blockIds = [];

  const addBlock = (block) => {
    blockMap[block.id] = block;
    blockIds.push(block.id);
    return block.id;
  };

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token.type === 'heading_open') {
      const level = Number(token.tag.replace('h', '')) || 1;
      const inline = tokens[i + 1];
      const text = inline?.children ? parseInlineTokens(inline.children) : [];
      const block = buildTextBlock('', `heading${level}`);
      block.text.inlineElements = text;
      addBlock(block);
      i += 3;
      continue;
    }
    if (token.type === 'paragraph_open') {
      const inline = tokens[i + 1];
      const text = inline?.children ? parseInlineTokens(inline.children) : [];
      const block = buildTextBlock('', 'body');
      block.text.inlineElements = text;
      addBlock(block);
      i += 3;
      continue;
    }
    if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') {
      const listKind = token.type === 'ordered_list_open' ? 'ordered' : 'unordered';
      const listBlock = {
        id: makeId('l'),
        parentId: 'document-id',
        kind: 'list',
        list: { kind: listKind, itemIds: [], itemMap: {} },
      };

      i += 1;
      while (i < tokens.length && tokens[i].type !== `${listKind}_list_close` && tokens[i].type !== 'bullet_list_close' && tokens[i].type !== 'ordered_list_close') {
        if (tokens[i].type === 'list_item_open') {
          const itemId = makeId('li');
          listBlock.list.itemIds.push(itemId);
          listBlock.list.itemMap[itemId] = { id: itemId, childIds: [] };
          i += 1;
          while (i < tokens.length && tokens[i].type !== 'list_item_close') {
            if (tokens[i].type === 'paragraph_open') {
              const inline = tokens[i + 1];
              const text = inline?.children ? parseInlineTokens(inline.children) : [];
              const block = buildTextBlock('', 'body');
              block.text.inlineElements = text;
              listBlock.list.itemMap[itemId].childIds.push(block.id);
              blockMap[block.id] = block;
              i += 3;
              continue;
            }
            if (tokens[i].type === 'bullet_list_open' || tokens[i].type === 'ordered_list_open') {
              // nested list
              const nestedMarkdown = md.renderer.render(tokens.slice(i), md.options, {});
              const nestedDoc = markdownToDocument(nestedMarkdown);
              nestedDoc.blockIds.forEach((id) => {
                listBlock.list.itemMap[itemId].childIds.push(id);
                blockMap[id] = nestedDoc.blockMap[id];
              });
              // break to avoid infinite loop
              while (i < tokens.length && tokens[i].type !== 'list_item_close') i += 1;
              continue;
            }
            i += 1;
          }
        }
        i += 1;
      }
      addBlock(listBlock);
      i += 1;
      continue;
    }
    if (token.type === 'hr') {
      addBlock({ id: makeId('hr'), parentId: 'document-id', kind: 'horizontalLine', horizontalLine: { kind: 1 } });
      i += 1;
      continue;
    }
    if (token.type === 'table_open') {
      const rowIds = [];
      const colIds = [];
      const cellMap = {};
      const rows = [];
      i += 1;
      while (i < tokens.length && tokens[i].type !== 'table_close') {
        if (tokens[i].type === 'tr_open') {
          const row = [];
          i += 1;
          while (i < tokens.length && tokens[i].type !== 'tr_close') {
            if (tokens[i].type === 'th_open' || tokens[i].type === 'td_open') {
              const cellTokens = tokens[i + 1];
              const inline = cellTokens?.children ? parseInlineTokens(cellTokens.children) : [];
              row.push(inline);
              i += 3;
              continue;
            }
            i += 1;
          }
          rows.push(row);
        }
        i += 1;
      }

      if (rows.length) {
        const colCount = rows[0].length;
        for (let c = 0; c < colCount; c += 1) colIds.push(`col${c + 1}`);
        rows.forEach((row, r) => {
          const rowId = `row${r + 1}`;
          rowIds.push(rowId);
          row.forEach((cell, c) => {
            const cellId = `${rowId}_${colIds[c]}`;
            const textBlock = buildTextBlock('', 'body');
            textBlock.text.inlineElements = Array.isArray(cell) ? cell : [];
            cellMap[cellId] = {
              id: cellId,
              rowSpan: '1',
              colSpan: '1',
              childIds: [textBlock.id],
            };
            blockMap[textBlock.id] = textBlock;
          });
        });
      }

      const tableBlock = {
        id: makeId('tb'),
        parentId: 'document-id',
        kind: 'table',
        table: { rowIds, columnIds: colIds, cellMap },
      };
      addBlock(tableBlock);
      i += 1;
      continue;
    }
    if (token.type === 'inline' && token.children) {
      const text = parseInlineTokens(token.children);
      const block = buildTextBlock('', 'body');
      block.text.inlineElements = text;
      addBlock(block);
      i += 1;
      continue;
    }
    i += 1;
  }

  return { id: 'document-id', blockIds, blockMap };
}

function decodeMeta(markdown) {
  const match = markdown.match(/<!--\s*wiki:meta\s+([A-Za-z0-9+/=]+)\s*-->/);
  if (!match) return null;
  try {
    const json = Buffer.from(match[1], 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function extractSection(markdown, startMarker, endMarker) {
  const pattern = new RegExp(`<!--\\s*${startMarker}\\s*-->[\\s\\S]*?<!--\\s*${endMarker}\\s*-->`, 'g');
  const match = markdown.match(pattern);
  if (!match?.length) return '';
  const raw = match[0];
  return raw
    .replace(new RegExp(`<!--\\s*${startMarker}\\s*-->`), '')
    .replace(new RegExp(`<!--\\s*${endMarker}\\s*-->`), '')
    .trim();
}

function extractDocSections(markdown) {
  const regex = /<!--\s*wiki:doc\s+([^\s]+)\s*-->([\s\S]*?)<!--\s*\/wiki:doc\s*-->/g;
  const docs = [];
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    docs.push({ id: match[1], content: match[2].trim() });
  }
  return docs;
}

function markdownToWiki(markdown, fileBase) {
  const meta = decodeMeta(markdown);
  const docSections = extractDocSections(markdown);

  const documentMap = {};
  if (docSections.length) {
    docSections.forEach((section) => {
      documentMap[section.id] = markdownToDocument(section.content || '');
    });
  } else {
    documentMap[makeId('doc')] = markdownToDocument(markdown);
  }

  let briefDescription = null;
  const briefContent = extractSection(markdown, 'wiki:brief-description', '/wiki:brief-description');
  if (briefContent) {
    briefDescription = markdownToDocument(briefContent);
  }

  const item = {
    itemId: meta?.itemId || fileBase,
    name: meta?.name || fileBase,
    mainType: meta?.mainType || undefined,
    subType: meta?.subType || undefined,
    brief: {
      ...(meta?.brief || {}),
      description: briefDescription || undefined,
    },
    caption: meta?.caption || [],
    document: {
      documentMap,
      chapterGroup: meta?.document?.chapterGroup || [],
      widgetCommonMap: meta?.document?.widgetCommonMap || {},
      extraInfo: meta?.document?.extraInfo || {},
    },
  };

  return {
    code: 0,
    message: 'OK',
    timestamp: String(Math.floor(Date.now() / 1000)),
    data: { item },
  };
}

function convertFile(filePath, outDir, mdOutDir) {
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath, ext);
  let markdown = '';

  if (ext === '.md') {
    markdown = fs.readFileSync(filePath, 'utf8');
  } else if (ext === '.json') {
    const data = readJson(filePath);
    markdown = wikiToMarkdown(data);
  } else {
    return null;
  }

  const mdPath = path.join(mdOutDir, `${base}.md`);
  writeText(mdPath, markdown || '');

  const wikiData = markdownToWiki(markdown || '', base);
  const outPath = path.join(outDir, `${base}.json`);
  writeJson(outPath, wikiData);

  return { name: `${base}.json`, path: `${base}.json` };
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.input) {
    console.error('Missing --input');
    process.exit(1);
  }
  defaultColor.value = args.defaultColor || '';
  let catalogPath = args.catalog;
  if (!catalogPath) {
    const tempCatalog = path.resolve(repoRoot, 'temp/catalog/full.json');
    const publicCatalog = path.resolve(repoRoot, 'public/temp/catalog/full.json');
    if (fs.existsSync(tempCatalog)) catalogPath = 'temp/catalog/full.json';
    else if (fs.existsSync(publicCatalog)) catalogPath = 'public/temp/catalog/full.json';
  }
  catalogMap.value = loadCatalogMap(catalogPath);

  const outDir = path.resolve(repoRoot, args.out);
  const mdOutDir = path.resolve(repoRoot, args.mdOut);
  ensureDir(outDir);
  ensureDir(mdOutDir);

  const files = listFiles(args.input);
  const outputs = [];

  for (const file of files) {
    const result = convertFile(file, outDir, mdOutDir);
    if (result) outputs.push(result);
  }

  writeJson(path.join(outDir, 'index.json'), { files: outputs });

  console.log(`Converted ${outputs.length} file(s).`);
}

main();
