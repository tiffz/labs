# Audit report

Generated: 2026-04-28T01:38:36.536Z
Repository `HEAD`: `64ff9e82437ae0d097385fab80a5f5d6ddc853b3`

## Summary

| Tool                            | Role                                      | Status     |
| ------------------------------- | ----------------------------------------- | ---------- |
| jscpd                           | Copy/paste / duplication                  | exit **0** |
| code-audit (`code-auditor-mcp`) | SOLID, DRY, and related checks on `./src` | exit **0** |
| knip                            | Unused exports, dead code                 | exit **0** |

Since last recorded audit commit: `(n/a)` → **0** insertion+deletion lines. Current approximate `src/**` line count: **213096**.

## jscpd (duplication)

| Metric                | Value     |
| --------------------- | --------- |
| Total lines scanned   | 166379    |
| Duplicated lines      | 4268      |
| Duplication (lines %) | **2.57%** |
| Clone groups          | 340       |

Raw JSON: `/Users/tiff/Code/labs [second checkout]/.audit-reports/jscpd/jscpd-report.json`

## code-audit (SOLID / DRY / architecture)

_Verbose `[DEBUG]` / extractor lines were omitted from this file._

```text
🔍 Code Quality Audit Tool
══════════════════════════════════════════════════
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 72
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1005
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1015
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1026
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1031
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1045
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1049
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1054
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1057
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1060
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1060
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1063
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1065
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1065
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1066
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1067
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1080
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1084
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1086
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1097
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1098
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1101
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1103
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1105
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1117
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1122
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1123
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1125
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1126
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1131
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1142
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1146
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1153
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1155
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1156
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1195
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1200
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1203
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1203
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1207
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1208
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1243
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1246
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1249
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1252
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1252
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1256
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1257
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1267
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1268
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1276
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1283
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1286
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1287
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1295
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1303
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1304
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1316
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1317
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1318
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1323
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1324
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1345
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1353
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1355
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1355
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1356
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1357
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1366
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1377
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1380
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1382
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1382
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1382
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1385
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1395
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1399
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1402
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1413
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1420
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1431
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1441
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1442
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1458
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1459
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1460
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1465
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1474
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1479
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1507
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1512
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1512
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1514
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1533
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1540
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1554
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1615
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1626
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1630
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1644
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1657
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1660
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1669
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1679
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1691
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1702
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1709
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1730
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1732
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1734
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1735
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1741
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1759
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1759
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1770
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1784
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1800
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1815
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1832
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1833
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1834
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1845
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1906
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1912
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1933
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1964
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1964
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1964
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1977
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2030
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2057
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2067
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2097
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2108
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2117
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2148
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2158
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2179
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2180
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2181
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2190
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2194
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2203
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2203
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2212
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2212
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2223
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2256
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2256
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2272
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2299
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2315
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2319
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2331
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2348
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2355
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2362
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 2373
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 55
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 68
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 167
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 192
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 23
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 62
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 59
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 89
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 17
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 28
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 33
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 5
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 12
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 18
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 48
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 75
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 93
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 20
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 80
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1022
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1029
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1040
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1049
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1056
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1057
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1072
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1073
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1088
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 55
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 28
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 57
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 59
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 29
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 61
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 77
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 81
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 86
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 90
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 102
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 115
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 120
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 127
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 132
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 139
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 144
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 177
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 186
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 26
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 30
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 34
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 38
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 57
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 61
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 96
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 109
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 138
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 150
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 186
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 196
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 206
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 224
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 228
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 237
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 241
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 245
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 264
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 269
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 39
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 48
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 52
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 18
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 74
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 10
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 8
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 12
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 75
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 109
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 115
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 147
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 38
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 71
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 31
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 52
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 50
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 76
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 103
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 144
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 207
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 236
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 280
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 300
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 338
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 349
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 608
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 662
}
  type: 'MethodDeclaration',
  isFunction: true,
  isMethod: true,
  line: 63
}
  type: 'MethodDeclaration',
  isFunction: true,
  isMethod: true,
  line: 98
}
  type: 'MethodDeclaration',
  isFunction: true,
  isMethod: true,
  line: 112
}
  type: 'MethodDeclaration',
  isFunction: true,
  isMethod: true,
  line: 127
}
  type: 'MethodDeclaration',
  isFunction: true,
  isMethod: true,
  line: 134
}
  type: 'MethodDeclaration',
  isFunction: true,
  isMethod: true,
  line: 188
}
  type: 'MethodDeclaration',
  isFunction: true,
  isMethod: true,
  line: 207
}
  type: 'MethodDeclaration',
  isFunction: true,
  isMethod: true,
  line: 215
}
  type: 'MethodDeclaration',
  isFunction: true,
  isMethod: true,
  line: 222
}
  type: 'MethodDeclaration',
  isFunction: true,
  isMethod: true,
  line: 232
}
  type: 'MethodDeclaration',
  isFunction: true,
  isMethod: true,
  line: 240
}
  type: 'MethodDeclaration',
  isFunction: true,
  isMethod: true,
  line: 280
}
  type: 'MethodDeclaration',
  isFunction: true,
  isMethod: true,
  line: 309
}
  type: 'MethodDeclaration',
  isFunction: true,
  isMethod: true,
  line: 317
}
  type: 'MethodDeclaration',
  isFunction: true,
  isMethod: true,
  line: 357
}
  type: 'MethodDeclaration',
  isFunction: true,
  isMethod: true,
  line: 364
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 15
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 82
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 120
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 134
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 165
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 4
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 52
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 144
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 159
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 179
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 259
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 44
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 161
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 308
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 336
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 362
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 407
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 445
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 482
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 506
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 516
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 691
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 823
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 916
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 1123
}
  type: 'FunctionDeclaration',
  isFunction: true,
  isMethod: false,
  line: 1230
}
  type: 'ArrowFunction',
  isFunction: true,
  isMethod: false,
  line: 1231
}

… (truncated, 1338547 chars total)
```

Exit code: **0**

## knip

```text

```

Exit code: **0**
