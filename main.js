const psProductFields = [
  'id', 'active', 'name', 'categories', 
  'price tax excluded', 'tax rules id', 'wholesale price', 'on sale', 
  'discount amount', 'discount percent', 'discount from', 'discount to', 
  'reference', 'supplier reference', 'supplier', 'manufacturer', 'ean13', 
  'upc', 'ecotax', 'width', 'height', 'depth', 'weight', 
  'delivery time in-stock', 'delivery time out-of-stock',
  'quantity', 'minimal quantity', 'low stock level', 'send email when quantity < level',
  'visibility', 'additional shipping cost', 'unity', 'unit price',
  'summary', 'description', 'tags', 'meta title', 'meta keywords', 
  'meta description', 'URL rewritten', 'text when in stock', 'text when backorder allowed',
  'available for order', 'available date', 'creation date', 'show price',
  'image URLs', 'image alt texts', 'delete existing images', 'feature',
  'online only', 'condition', 'customizable (0 = No, 1 = Yes)', 
  'uploadable files (0 = No, 1 = Yes)', 'text fields (0 = No, 1 = Yes)',
  'out of stock action', 'virtual product', 'file URL', 'allowed downloads',
  'expiration date', 'number of days', 'shop id/name', 
  'advanced stock management', 'depends On Stock', 'warehouse', 'acessories'
];

const psCombinationsFields = [
  'product_ID', 'attribute', 'value', 'supplier reference', 'reference', 'ean13',
  'upc', 'wholesale price', 'impact on price', 'ecotax', 'quantity', 
  'minimal quantity', 'low stock level', 'impact on weight', 'default', 
  'available date', 'image position', 'image urls', 'img alt text',
  'shop id/name', 'advanced stock managment', 'depends on stock', 'warehouse'
];

const updateProductsBtn = document.querySelector('#updateProducts');

updateProductsBtn.addEventListener('click', async (event) => {
  event.stopPropagation();
  event.preventDefault();
  
  const psRawCsv = document.querySelector('#psProducts').files[0];
  const teinorRawXml = document.querySelector('#xmlProducts').files[0];
  
  const psJson = await getPsProductsJson(psRawCsv);
  const teinorXml = await getTeinorProductsXml(teinorRawXml);
  const teinorJson = parseTeinorProducts(teinorXml);
  
  const updatedPsList = updatePsProducts(psJson, teinorJson);
  const updatedProducts = updatedPsList.updatedProducts;
  const unfoundProducts = updatedPsList.unfoundProducts;

  const headers = ['id', 'name', 'reference', 'priceTin', 'quantity', 'active'];
  const updatedProductsCsv = buildCsv(updatedProducts, headers);
  const unfoundProductsCsv = buildCsv(unfoundProducts, headers);

  downloadCsv(updatedProductsCsv, 'updated_products.csv');
  downloadCsv(unfoundProductsCsv, 'unfound_products.csv');

  /*switch (option) {
    case "products":
      csv = await getProductsCsv(xml);
      for (const lang in csv) {
        const langName = lang === '1' ? 'es' : lang === '2' ? 'ca' : 'en';
        const encodedUri = encodeURI(csv[lang]);
        const fileName = 'products-' + langName + '.csv' ;
        downloadCsv(encodedUri, fileName);
      }
      break;
    case "combinations":
      csv = await getCombinationsCsv(xml);
      const encodedUri = encodeURI(csv);
      downloadCsv(encodedUri, 'combinations.csv');
      break;
  }*/
});

async function getPsProductsJson(psCsv) {
  const csvContent = await getFileContent(psCsv);
  const json = await csv({
    delimiter: ';',
    headers: [
      'id', 'imageUrl', 'name', 'reference', 'category', 'priceTex', 'priceTin', 
      'quantity', 'active', 'position'
    ]
  }).fromString(csvContent);
  return json;
}

async function getTeinorProductsXml(rawXml) {
  const parsedXml = await parseXml(rawXml);
  const xmlProducts = Array.from(parsedXml.querySelectorAll('twinPrestaShop5'));
  return xmlProducts;
}

function parseTeinorProducts(teinorProductsXml) {
  const unifiedProducts = teinorProductsXml.reduce((unified, product) => {
    const reference = product.querySelector('reference').innerHTML;
    const price = product.querySelector('price_tin').innerHTML;
    const quantity = product.querySelector('quantity').innerHTML;

    if (unified.hasOwnProperty(reference)) {
      unifiedProduct = unified[reference];

      if (unifiedProduct.price !== price) {
        unifiedProduct.consistentData = false;
        unifiedProduct.price = String(Math.max(
          Number(price), Number(unifiedProduct.price)
        ));
      }

      if (unifiedProduct.quantity !== quantity) {
        unifiedProduct.consistentData = false;
        unifiedProduct.quantity = String(Math.min(
          Number(quantity), Number(unifiedProduct.quantity)
        ));
        unifiedProduct.active = Number(unifiedProduct.quantity) > 3 ? '1' : '0';
      }
    } else {
      unified[reference] = {};
      unifiedProduct = unified[reference];
      
      unifiedProduct.price = price;
      unifiedProduct.quantity = quantity;
      unifiedProduct.active = Number(unifiedProduct.quantity) > 3 ? '1' : '0';
      unifiedProduct.consistentData = true;
    }

    return unified;
  }, {});

  const products = [];
  
  for (const reference in unifiedProducts) {
    const product = unifiedProducts[reference];
    product.reference = reference;
    products.push(product);
  }

  return products;
}

function updatePsProducts(psProducts, teinorProducts) {
  const updatedProducts = [];
  const unfoundProducts = [];

  for (let product of psProducts) {
    let updated = false;
    product = Object.assign({}, product);
    const teinorProduct = teinorProducts.find(x => x.reference === product.reference);
    
    if (!teinorProduct) {
      unfoundProducts.push(product);
      continue;
    }

    if (product.priceTin !== teinorProduct.price) {
      updated = true;
      product.priceTin = teinorProduct.price;
    }

    if (product.quantity !== teinorProduct.quantity) {
      updated = true;
      product.quantity = teinorProduct.quantity;
    }

    if (product.active !== teinorProduct.active) {
      updated = true;
      product.active = teinorProduct.active;
    }

    if (updated) updatedProducts.push(product);
  }
  
  return { updatedProducts, unfoundProducts };
}

function buildCsv(json, headers) {
  let csv = 'data:text/csv;charset=utf-8,';
  csv += headers.join(';') + '\n';
  json.forEach(item => { csv += buildCsvLine(item, headers); });
  return csv;
}

function buildCsvLine(item, headers) {
  let line = '';
  for (const header of headers) {
    let fieldValue = item[header];
    fieldValue = fieldValue.replace(/"/g, '""');
    line += `"${fieldValue}"`;
    line += ';'
  }
  line += '\n';
  return line;
}

function downloadCsv(csv, fileName) {
  const csvUri = encodeURI(csv);
  const link = document.createElement("a");
  link.setAttribute("href", csvUri);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
}

function filterByLang(xmlItems) {
  return xmlItems.reduce((filtered, value) => {
    const lang = value.querySelector('language').innerHTML;
    if (!filtered[lang]) filtered[lang] = [];
    filtered[lang].push(value);
    return filtered;
  }, {});
}

function parseProductsXml2Csv(xmlProducts) {
  let csv = 'data:text/csv;charset=utf-8,';
  csv += psProductFields.join(';') + '\n';
  xmlProducts.forEach(product => { csv += buildProductLine(product) + '\n'; });
  return csv;
}

function buildProductLine(xmlProduct) {
  let line = '';
  for (const field of psProductFields) {
    let fieldValue = getProductValue(xmlProduct, field);
    fieldValue = fieldValue.replace(/"/g, '""');
    line += `"${fieldValue}"`;
    line += ';'
  }
  return line;
}

function getProductValue(xmlProduct, field) {
  switch (field) {
    case 'active':
      const active = xmlProduct.querySelector('active').innerHTML;
      if (active !== '0' && active !== '1') throw new Error('Wrong active value');
      return active;
    case 'name':
      const name = xmlProduct.querySelector('name').innerHTML;
      if (!name || name === '') throw new Error('No product name');
      return name;
    case 'categories':
      return xmlProduct.querySelector('category').innerHTML;
    case 'price tax excluded':
      return xmlProduct.querySelector('price_tin').innerHTML;
    case 'tax rules id':
      return xmlProduct.querySelector('id_tax_rules_group').innerHTML;
    case 'wholesale price':
      return xmlProduct.querySelector('wholesale_price').innerHTML;
    case 'on sale':
      const onSale = xmlProduct.querySelector('on_sale').innerHTML;
      if (onSale !== '0' && onSale !== '1') throw new Error('Wrong on_sale value');
      return onSale;
    case 'discount amount':
      return xmlProduct.querySelector('reduction_price').innerHTML;
    case 'discount percent':
      return xmlProduct.querySelector('reduction_percent').innerHTML;
    case 'reference':
      return xmlProduct.querySelector('reference').innerHTML;
    case 'supplier reference':
      return xmlProduct.querySelector('supplier_reference').innerHTML;
    case 'supplier':
      return xmlProduct.querySelector('supplier').innerHTML;
    case 'manufacturer':
      return xmlProduct.querySelector('manufacturer').innerHTML;
    case 'weight':
      return xmlProduct.querySelector('weight').innerHTML;
    case 'quantity':
      return xmlProduct.querySelector('quantity').innerHTML;
    /*case 'description':
      return xmlProduct.querySelector('description_short').innerHTML;*/
    case 'meta title':
      return xmlProduct.querySelector('meta_title').innerHTML;
    case 'meta keywords':
      return xmlProduct.querySelector('meta_keywords').innerHTML;
    case 'meta description':
      return xmlProduct.querySelector('meta_description').innerHTML;
    case 'URL rewritten':
      return xmlProduct.querySelector('link_rewrite').innerHTML;
    case 'available for order':
      const available = xmlProduct.querySelector('available_for_order').innerHTML;
      if (available !== '0' && available !== '1') throw new Error('Wrong available_for_order value');
      return available;
    case 'show price': 
      const showPrice = xmlProduct.querySelector('show_price').innerHTML;
      if (showPrice !== '0' && showPrice !== '1') throw new Error('Wrong show_price value');
      return showPrice;
    case 'delete existing images':
      const deleteImages = xmlProduct.querySelector('delete_existing_images').innerHTML;
      if (deleteImages !== '0' && deleteImages !== '1') throw new Error('Wrong delete_existing_images value');
      return deleteImages;
    case 'feature':
      return xmlProduct.querySelector('features').innerHTML;
    case 'online only':
      const onlineOnly = xmlProduct.querySelector('online_only').innerHTML;
      if (onlineOnly !== '0' && onlineOnly !== '1') throw new Error('Wrong online_only value');
      return onlineOnly;
    case 'customizable':
    case 'uploadable files':
    case 'text fields':
      return '0';
    case 'shop id/name':
      return xmlProduct.querySelector('shop').innerHTML;
    default:
      return '';
  }
}

async function getCombinationsCsv(xml) {
  const xmlCombinations = await parseXml(xml);
  const combinations = Array.from(xmlCombinations.querySelectorAll('twinPrestaShopProductAttributes'));
  const csv = parseCombinationsXml2Csv(combinations);
  return csv;
}

function parseCombinationsXml2Csv(xmlCombinations) {
  let csv = 'data:text/csv;charset=utf-8,';
  csv += psCombinationsFields.join(';') + '\n';
  xmlCombinations.forEach(combination => { csv += buildCombinationLine(combination) + '\n'; });
  return csv;
}

function buildCombinationLine(xmlCombination) {
  let line = '';
  for (const field of psCombinationsFields) {
    let fieldValue = getCombinationValue(xmlCombination, field);
    fieldValue = fieldValue.replace(/"/g, '""');
    line += `"${fieldValue}"`;
    line += ';'
  }
  return line;
}

function getCombinationValue(xmlCombination, field) {
  switch (field) {
    case 'attribute':
      return xmlCombination.querySelector('group').innerHTML;
    case 'value':
        return xmlCombination.querySelector('attribute').innerHTML;
    case 'supplier reference':
      return xmlCombination.querySelector('supplier_reference').innerHTML;
    case 'reference':
      return xmlCombination.querySelector('referenceproduct').innerHTML;
    case 'wholesale price':
        return xmlCombination.querySelector('wholesale_price').innerHTML;
    case 'impact on price':
      return xmlCombination.querySelector('price').innerHTML;
    case 'ecotax':
      return xmlCombination.querySelector('ecotax').innerHTML;
    case 'quantity':
      return xmlCombination.querySelector('quantity').innerHTML;
    case 'minimal quantity':
      return xmlCombination.querySelector('minimal_quantity').innerHTML;
    case 'impact on weight':
      return xmlCombination.querySelector('weight').innerHTML;
    case 'default':
        return xmlCombination.querySelector('default_on') ? '0': '1';
    case 'shop id/name':
      return xmlCombination.querySelector('shop').innerHTML;
    default:
      return '';
  }
}

function getFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result);
    };

    reader.onerror = reject;

    reader.readAsText(file);
  })
}

async function parseXml(xml) {
  try {
    const content = await getFileContent(xml);
    const parser = new DOMParser();
    const parsedXml = parser.parseFromString(content, 'application/xml');
    if (parsedXml.documentElement.nodeName === 'parsererror') {
      throw new Error('Error while parsing XML file.');
    } else {
      return parsedXml.documentElement;
    }
  } catch(error) {
    alert(error);
  }
}
