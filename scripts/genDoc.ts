import path = require('path');
import fs = require('fs');
import doctrine = require('doctrine');

const workDir = path.resolve(path.dirname(__dirname));
const jsFile = path.join(workDir, 'src/evalutor.ts');
const outputFile = path.join(workDir, 'dist/doc.js');

function getFormulaComments(contents: string) {
  const comments: Array<{
    fnName: string;
    comments: string;
  }> = [];

  contents.replace(/\/\*[\s\S]+?\*\//g, (_, index, input) => {
    const pos = index + _.length;
    const following = input.substring(pos, pos + 200);

    if (/^\s*fn(\w+)\(/.test(following)) {
      comments.push({
        fnName: RegExp.$1,
        comments: _
      });
    }

    return _;
  });

  return comments;
}

async function main(...params: Array<any>) {
  const contents = fs.readFileSync(jsFile, 'utf8');

  const comments = getFormulaComments(contents);
  const result = comments.map(item => {
    const ast = doctrine.parse(item.comments, {
      unwrap: true
    });
    const result: any = {
      name: item.fnName,
      description: ast.description
    };

    let example = '';
    let params: Array<any> = [];
    let returns: any = undefined;
    let namespace = '';
    ast.tags.forEach(tag => {
      if (tag.title === 'example') {
        example = tag.description!;
      } else if (tag.title === 'namespace') {
        namespace = tag.name!;
      } else if (tag.title === 'param') {
        params.push({
          type: (tag.type as any)?.name,
          name: tag.name,
          description: tag.description
        });
      } else if (tag.title === 'returns') {
        returns = {
          type: (tag.type as any)?.name,
          description: tag.description
        };
      }
    });

    result.example = example;
    result.params = params;
    result.returns = returns;
    result.namespace = namespace;

    return result;
  });

  fs.writeFileSync(
    outputFile,
    `/**\n * 公式文档\n */\nexport default ${JSON.stringify(
      result,
      null,
      2
    )}`.replace(/\"(\w+)\"\:/g, (_, key) => `${key}:`),
    'utf8'
  );
  console.log(`公式文档生成 > ${outputFile}`);
}

main().catch(e => console.error(e));
