window.$ = window.jQuery = require('./lib/jquery-3.5.1.min.js');

async function scanFiles(entry, tmpObject) {
  switch (true) {
    case (entry.isDirectory) :
      const entryReader = entry.createReader();
      const entries = await new Promise(resolve => {
        entryReader.readEntries(entries => resolve(entries));
      });
      await Promise.all(entries.map(entry => scanFiles(entry, tmpObject)));
      break;
    case (entry.isFile) :
      tmpObject.push(entry);
      break;
  }
}

document.getElementById("droparea")
  .addEventListener("dragover", event => {
    event.preventDefault();
  }, false);

document.getElementById("droparea")
  .addEventListener("drop", async event => {
    event.preventDefault();
    const items = event.dataTransfer.items;
    const results = [];
    const promise = [];
    for (const item of items) {
      const entry = item.webkitGetAsEntry();
      promise.push(scanFiles(entry, results));
    }
    await Promise.all(promise);
    /*--------------------追加コード--------------------*/
    const fileList = await getMarkdownFileList(results)
    console.log(fileList);
    const fileLinkList = getLinkList(fileList);
    console.log(fileLinkList);
    const fileHtmlList = getHtmlLink(fileLinkList);
    printLinkList(fileLinkList);
    printResult(fileHtmlList);
    /*-----------------------------------------------*/

  }, false);

function getHtmlLink(fileLinkList) {
  const html_pattern = /\(.*?\)/g
  // .mdを除いたファイル名
  const files_name_list = fileLinkList.map ( f => {
    let normalized = f.filePath.normalize('NFC');
    return normalized.substr(0, normalized.length -3)
  })
  const result = []
  fileLinkList.forEach ( file => {
    console.log("# file: " + file.filePath);
    notFoundLinkList = [];
    file.linkList.forEach ( link => {
      while((arr = html_pattern.exec(link.link)) != null){
        if (arr[0].includes(".html")) {
          // カッコだけ除く
          file_link_path_full = arr[0].slice(1).slice(0, -1).trim().normalize('NFC')
          // .htmlを除いたpath
          file_link_path = file_link_path_full.substr(0, file_link_path_full.length - 5)
          let result = files_name_list.some( fn => {
            return fn == file_link_path
          })
          if (result == false) {
            console.log("  - not found link: " + file_link_path_full);
            notFoundLinkList.push({
              "line_num": link.line_num,
              "link": file_link_path_full
            });
          }
        }
      }
    })
    if (notFoundLinkList.length !== 0) {
      result.push({
        "filePath": file.filePath,
        "notFoundLinkList": notFoundLinkList
      });
    }
  })
  return result;
}

function getLinkList(fileList) {
  let fileLinkList = [];
  const link_pattern = /\[.*?\]\(.*?\.html\)/g
  fileList.forEach( file => {
    linkList = []
    const lines = file.body.replace(/\r\n|\r/g, "\n").split("\n")
    let line_num = 1;
    lines.forEach ( line => {
      while((arr = link_pattern.exec(line)) != null){
        linkList.push({
          "line_num": line_num,
          "link": arr[0]
        });
      }
      line_num += 1;
    })

    fileLinkList.push({
      'filePath': file.filePath,
      'linkList': linkList
    });
  });
  return fileLinkList;
}

async function getMarkdownFileList(results) {
  let fileList = [];
  for (let result of results) {
    let file = await getFile(result);
    // .mdになるであろう下３文字とって判定する
    if (result.name.slice(-3) === ".md") {
      let body = await readFile(file)
      fileList.push({
        'filePath': result.fullPath.trim(),
        'body': body
      })
    }
  }
  return fileList;
}

function readFile(file){
  return new Promise((resolve, reject) => {
    var fr = new FileReader();  
    fr.onload = () => {
      resolve(fr.result)
    };
    fr.readAsText(file);
  });
}

async function getFile(fileEntry) {
  try {
    return await new Promise((resolve, reject) => fileEntry.file(resolve, reject));
  } catch (err) {
    console.log(err);
  }
}

function printResult(fileHtmlList) {
  let parent_object = document.getElementById('result-area');
  parent_object.innerHTML = fileHtmlList.map ( file => {
    return "<p class=\"my-0\"># filePath: " + file.filePath + "</p><p class=\"px-1\">" + 
      file.notFoundLinkList.map ( link => {
        return "  - l" + link.line_num + ": "  + link.link
      }).join("<br/>") + "</p>"
  }).join("<br>")
}

function printLinkList(fileLinkList) {
  let parent_object = document.getElementById('file-link-list');
  parent_object.innerHTML = fileLinkList.map ( file => {
    return "<h5># filePath: " + file.filePath + "</h5>" +
      file.linkList.map ( link => {
        return "  - l" + link.line_num + ": "  + link.link
      }).join("<br/>")
  }).join("<br/>")
}
