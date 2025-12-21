const fs = require('fs').promises;
const path = require('path');

// 前 300 常用汉字
const COMMON_CHARS = "的一是在不了有和人这中大为上个国学生时以会可到而子地发下过天家年说来道方如多然去行小好心她开美事自那还能于之都里经问主起也实进面作当出分从日因样高长理但使看题意定其动所先回知新通并提关性间情只些最明四老见机无相第正此已公等由平代与全又身许法外很母父重民同水清万叫儿几成应今点比文把结解电内认被想听线化马光白山王门工场李张三五东口车北西米石真太早气花鸟鱼虫林草木森火水土金田井手目耳口牙舌足日月星云风雨雷电山水河海天地上下左右中大小多少长短高低远近前后内外开关";
const uniqueChars = [...new Set(COMMON_CHARS.split(''))].slice(0, 300);

// 输出路径
// const H5_STATIC_DIR = path.join(__dirname, 'src', 'static', 'stroke-data');
// const MP_STATIC_DIR = path.join(__dirname, 'src', 'subPackages', 'study-tools', 'static', 'stroke-data');
const MP_MODULE_DIR = path.join(__dirname, 'src', 'subPackages', 'study-tools', 'stroke-data'); // 新增：JS 模块目录

async function main() {
    // 创建输出目录
    // await fs.mkdir(H5_STATIC_DIR, { recursive: true });
    // await fs.mkdir(MP_STATIC_DIR, { recursive: true });
    await fs.mkdir(MP_MODULE_DIR, { recursive: true });

    console.log(`🎯 准备生成 ${uniqueChars.length} 个汉字的笔顺数据...`);
    // console.log(`📁 小程序 static (JSON): ${MP_STATIC_DIR}`);
    // console.log(`🌐 H5 static (JSON): ${H5_STATIC_DIR}`);
    console.log(`📦 小程序 stroke-data (JS 模块): ${MP_MODULE_DIR}\n`);

    const generatedModules = []; // 用于记录成功生成的 { char, filename }

    for (const char of uniqueChars) {
        try {
            const data = require(`hanzi-writer-data/${char}`);

            if (Array.isArray(data.strokes)) {
                const codePoint = char.codePointAt(0);
                const hex = codePoint.toString(16).toUpperCase().padStart(4, '0');
                const jsonFilename = `U_${hex}.json`;
                const jsFilename = `U_${hex}.js`;

                // 1. 写入 static/xxx.json（给 H5 和旧逻辑备用）
                // await fs.writeFile(
                //     path.join(H5_STATIC_DIR, jsonFilename),
                //     JSON.stringify(data, null, 2),
                //     'utf8'
                // );
                // await fs.writeFile(
                //     path.join(MP_STATIC_DIR, jsonFilename),
                //     JSON.stringify(data, null, 2),
                //     'utf8'
                // );

                // 2. 写入 stroke-data/U_xxxx.js（ES 模块）
                const jsContent = `export default ${JSON.stringify(data, null, 2)};\n`;
                await fs.writeFile(
                    path.join(MP_MODULE_DIR, jsFilename),
                    jsContent,
                    'utf8'
                );

                // 记录用于 index.js
                generatedModules.push({ char, jsFilename, varName: `U_${hex}` });

                console.log(`✅ ${char} → ${jsFilename}`);
            }
        } catch (e) {
            console.warn(`❌ 跳过: ${char} (${e.message.includes('Cannot find module') ? '无数据' : e.message})`);
        }
    }

    // 3. 生成 index.js
    const importLines = generatedModules.map(m =>
        `import ${m.varName} from './${m.jsFilename}';`
    ).join('\n');

    const mapEntries = generatedModules.map(m =>
        `  '${m.char}': ${m.varName}`
    ).join(',\n');

    const indexJsContent = `${importLines}

const charMap = {
${mapEntries}
};

export function getCharData(char) {
  return charMap[char] || null;
}
`;

    await fs.writeFile(
        path.join(MP_MODULE_DIR, 'index.js'),
        indexJsContent,
        'utf8'
    );

    console.log(`\n🎉 完成！成功生成 ${generatedModules.length}/${uniqueChars.length} 个字`);
    console.log(`📄 已生成模块入口: ${path.join(MP_MODULE_DIR, 'index.js')}`);
}

main().catch(err => {
    console.error('💥 脚本出错:', err);
    process.exit(1);
});