type MapEntry = [number, [number, number]];

export const EVENT_FLAGS: Array<MapEntry> = [
  [6080, [0x2f8, 7]],
  [300, [0x25, 3]],
  [310, [0x26, 1]],
  [301, [0x25, 2]],
  [302, [0x25, 1]],
  [62010, [0x5dd, 5]],
  [62011, [0x5dd, 4]],
  [62012, [0x5dd, 3]],
  [62020, [0x5de, 3]],
  [62021, [0x5de, 2]],
  [62022, [0x5de, 1]],
  [62030, [0x5df, 1]],
  [62031, [0x5df, 0]],
  [62032, [0x5e0, 7]],
  [62040, [0x5e1, 7]],
  [62041, [0x5e1, 6]],
  [62050, [0x5e2, 5]],
  [62051, [0x5e2, 4]],
  [62052, [0x5e2, 3]],
  [62053, [0x5e2, 2]],
  [62004, [0x5dc, 3]],
  [62005, [0x5dc, 2]],
  [62006, [0x5dc, 1]],
  [62007, [0x5dc, 0]],
  [62008, [0x5dd, 7]],
  [62009, [0x5dd, 6]],
  [62060, [0x5e3, 3]],
  [62061, [0x5e3, 2]],
  [62062, [0x5e3, 1]],
  [62063, [0x5e3, 0]],
  [62064, [0x5e4, 7]],
  [62065, [0x5e4, 6]],
  [2000, [0xfa, 7]],
  [2100, [0x106, 3]],
  [200, [0x19, 7]],
  [71000, [0xa41, 7]],
  [71001, [0xa41, 6]],
  [71002, [0xa41, 5]],
  [71003, [0xa41, 4]],
  [71004, [0xa41, 3]],
  [71005, [0xa41, 2]],
  [71006, [0xa41, 1]],
  [71007, [0xa41, 0]],
  [71008, [0xa42, 7]],
  [71100, [0xa4d, 3]],
  [71101, [0xa4d, 2]],
  [71102, [0xa4d, 1]],
  [71103, [0xa4d, 0]],
  [71104, [0xa4e, 7]],
  [71105, [0xa4e, 6]],
  [71107, [0xa4e, 4]],
  [71108, [0xa4e, 3]],
  [71109, [0xa4e, 2]],
  [71120, [0xa50, 7]],
  [71121, [0xa50, 6]],
  [71122, [0xa50, 5]],
  [71123, [0xa50, 4]],
  [71124, [0xa50, 3]],
  [71125, [0xa50, 2]],
  [71190, [0xa58, 1]],
  [71210, [0xa5b, 5]],
  [71211, [0xa5b, 4]],
  [71212, [0xa5b, 3]],
  [71213, [0xa5b, 2]],
  [71214, [0xa5b, 1]],
  [71215, [0xa5b, 0]],
  [71216, [0xa5c, 7]],
  [71218, [0xa5c, 5]],
  [71219, [0xa5c, 4]],
  [71220, [0xa5c, 3]],
  [71221, [0xa5c, 2]],
  [71222, [0xa5c, 1]],
  [71223, [0xa5c, 0]],
  [71224, [0xa5d, 7]],
  [71225, [0xa5d, 6]],
  [71226, [0xa5d, 5]],
  [71227, [0xa5d, 4]],
  [71230, [0xa5d, 1]],
  [71231, [0xa5d, 0]],
  [71232, [0xa5e, 7]],
  [71233, [0xa5e, 6]],
  [71234, [0xa5e, 5]],
  [71235, [0xa5e, 4]],
  [71240, [0xa5f, 7]],
  [71250, [0xa60, 5]],
  [71251, [0xa60, 4]],
  [71252, [0xa60, 3]],
  [71253, [0xa60, 2]],
  [71270, [0xa62, 1]],
  [71271, [0xa62, 0]],
  [71300, [0xa66, 3]],
  [71301, [0xa66, 2]],
  [71302, [0xa66, 1]],
  [71303, [0xa66, 0]],
  [71304, [0xa67, 7]],
  [71305, [0xa67, 6]],
  [71306, [0xa67, 5]],
  [71307, [0xa67, 4]],
  [71308, [0xa67, 3]],
  [71309, [0xa67, 2]],
  [71310, [0xa67, 1]],
  [71400, [0xa73, 7]],
  [71401, [0xa73, 6]],
  [71402, [0xa73, 5]],
  [71403, [0xa73, 4]],
  [71500, [0xa7f, 3]],
  [71501, [0xa7f, 2]],
  [71502, [0xa7f, 1]],
  [71503, [0xa7f, 0]],
  [71504, [0xa80, 7]],
  [71505, [0xa80, 6]],
  [71506, [0xa80, 5]],
  [71507, [0xa80, 4]],
  [71508, [0xa80, 3]],
  [71600, [0xa8c, 7]],
  [71601, [0xa8c, 6]],
  [71602, [0xa8c, 5]],
  [71603, [0xa8c, 4]],
  [71604, [0xa8c, 3]],
  [71605, [0xa8c, 2]],
  [71606, [0xa8c, 1]],
  [71607, [0xa8c, 0]],
  [71800, [0xaa5, 7]],
  [71801, [0xaa5, 6]],
  [71900, [0xab1, 3]],
  [73000, [0xb3b, 7]],
  [73001, [0xb3b, 6]],
  [73002, [0xb3b, 5]],
  [73003, [0xb3b, 4]],
  [73004, [0xb3b, 3]],
  [73005, [0xb3b, 2]],
  [73006, [0xb3b, 1]],
  [73007, [0xb3b, 0]],
  [73008, [0xb3c, 7]],
  [73009, [0xb3c, 6]],
  [73010, [0xb3c, 5]],
  [73011, [0xb3c, 4]],
  [73012, [0xb3c, 3]],
  [73013, [0xb3c, 2]],
  [73014, [0xb3c, 1]],
  [73015, [0xb3c, 0]],
  [73016, [0xb3d, 7]],
  [73017, [0xb3d, 6]],
  [73018, [0xb3d, 5]],
  [73019, [0xb3d, 4]],
  [73020, [0xb3d, 3]],
  [73100, [0xb47, 3]],
  [73101, [0xb47, 2]],
  [73102, [0xb47, 1]],
  [73103, [0xb47, 0]],
  [73104, [0xb48, 7]],
  [73105, [0xb48, 6]],
  [73106, [0xb48, 5]],
  [73107, [0xb48, 4]],
  [73109, [0xb48, 2]],
  [73110, [0xb48, 1]],
  [73111, [0xb48, 0]],
  [73112, [0xb49, 7]],
  [73115, [0xb49, 4]],
  [73117, [0xb49, 2]],
  [73118, [0xb49, 1]],
  [73119, [0xb49, 0]],
  [73120, [0xb4a, 7]],
  [73121, [0xb4a, 6]],
  [73122, [0xb4a, 5]],
  [73200, [0xb54, 7]],
  [73201, [0xb54, 6]],
  [73202, [0xb54, 5]],
  [73204, [0xb54, 3]],
  [73205, [0xb54, 2]],
  [73207, [0xb54, 0]],
  [73257, [0xb5b, 6]],
  [73208, [0xb55, 7]],
  [73211, [0xb55, 4]],
  [73410, [0xb6e, 5]],
  [73412, [0xb6e, 3]],
  [73420, [0xb6f, 3]],
  [73421, [0xb6f, 2]],
  [73422, [0xb6f, 1]],
  [73430, [0xb70, 1]],
  [73431, [0xb70, 0]],
  [73432, [0xb71, 7]],
  [73440, [0xb72, 7]],
  [73441, [0xb72, 6]],
  [73450, [0xb73, 5]],
  [73451, [0xb73, 4]],
  [73460, [0xb74, 3]],
  [73500, [0xb79, 3]],
  [73501, [0xb79, 2]],
  [73502, [0xb79, 1]],
  [73503, [0xb79, 0]],
  [73504, [0xb7a, 7]],
  [73900, [0xbab, 3]],
  [73901, [0xbab, 2]],
  [73902, [0xbab, 1]],
  [76100, [0xcbe, 3]],
  [76101, [0xcbe, 2]],
  [76102, [0xcbe, 1]],
  [76103, [0xcbe, 0]],
  [76104, [0xcbf, 7]],
  [76105, [0xcbf, 6]],
  [76106, [0xcbf, 5]],
  [76108, [0xcbf, 3]],
  [76110, [0xcbf, 1]],
  [76111, [0xcbf, 0]],
  [76113, [0xcc0, 6]],
  [76114, [0xcc0, 5]],
  [76116, [0xcc0, 3]],
  [76117, [0xcc0, 2]],
  [76118, [0xcc0, 1]],
  [76119, [0xcc0, 0]],
  [76120, [0xcc1, 7]],
  [76150, [0xcc4, 1]],
  [76151, [0xcc4, 0]],
  [76152, [0xcc5, 7]],
  [76153, [0xcc5, 6]],
  [76154, [0xcc5, 5]],
  [76155, [0xcc5, 4]],
  [76156, [0xcc5, 3]],
  [76157, [0xcc5, 2]],
  [76158, [0xcc5, 1]],
  [76159, [0xcc5, 0]],
  [76160, [0xcc6, 7]],
  [76161, [0xcc6, 6]],
  [76162, [0xcc6, 5]],
  [76200, [0xccb, 7]],
  [76201, [0xccb, 6]],
  [76202, [0xccb, 5]],
  [76203, [0xccb, 4]],
  [76204, [0xccb, 3]],
  [76205, [0xccb, 2]],
  [76206, [0xccb, 1]],
  [76207, [0xccb, 0]],
  [76208, [0xccc, 7]],
  [76209, [0xccc, 6]],
  [76210, [0xccc, 5]],
  [76211, [0xccc, 4]],
  [76212, [0xccc, 3]],
  [76213, [0xccc, 2]],
  [76214, [0xccc, 1]],
  [76215, [0xccc, 0]],
  [76216, [0xccd, 7]],
  [76217, [0xccd, 6]],
  [76218, [0xccd, 5]],
  [76219, [0xccd, 4]],
  [76220, [0xccd, 3]],
  [76221, [0xccd, 2]],
  [76222, [0xccd, 1]],
  [76223, [0xccd, 0]],
  [76224, [0xcce, 7]],
  [76225, [0xcce, 6]],
  [76226, [0xcce, 5]],
  [76227, [0xcce, 4]],
  [76228, [0xcce, 3]],
  [76229, [0xcce, 2]],
  [76230, [0xcce, 1]],
  [76231, [0xcce, 0]],
  [76232, [0xccf, 7]],
  [76233, [0xccf, 6]],
  [76234, [0xccf, 5]],
  [76235, [0xccf, 4]],
  [76236, [0xccf, 3]],
  [76237, [0xccf, 2]],
  [76238, [0xccf, 1]],
  [76239, [0xccf, 0]],
  [76240, [0xcd0, 7]],
  [76241, [0xcd0, 6]],
  [76242, [0xcd0, 5]],
  [76243, [0xcd0, 4]],
  [76244, [0xcd0, 3]],
  [76245, [0xcd0, 2]],
  [76247, [0xcd0, 0]],
  [76250, [0xcd1, 5]],
  [76251, [0xcd1, 4]],
  [76252, [0xcd1, 3]],
  [76300, [0xcd7, 3]],
  [76301, [0xcd7, 2]],
  [76302, [0xcd7, 1]],
  [76303, [0xcd7, 0]],
  [76304, [0xcd8, 7]],
  [76305, [0xcd8, 6]],
  [76306, [0xcd8, 5]],
  [76307, [0xcd8, 4]],
  [76308, [0xcd8, 3]],
  [76309, [0xcd8, 2]],
  [76310, [0xcd8, 1]],
  [76311, [0xcd8, 0]],
  [76312, [0xcd9, 7]],
  [76313, [0xcd9, 6]],
  [76314, [0xcd9, 5]],
  [76350, [0xcdd, 1]],
  [76351, [0xcdd, 0]],
  [76352, [0xcde, 7]],
  [76353, [0xcde, 6]],
  [76354, [0xcde, 5]],
  [76355, [0xcde, 4]],
  [76356, [0xcde, 3]],
  [76357, [0xcde, 2]],
  [76320, [0xcda, 7]],
  [76321, [0xcda, 6]],
  [76322, [0xcda, 5]],
  [76400, [0xce4, 7]],
  [76401, [0xce4, 6]],
  [76402, [0xce4, 5]],
  [76403, [0xce4, 4]],
  [76404, [0xce4, 3]],
  [76405, [0xce4, 2]],
  [76406, [0xce4, 1]],
  [76407, [0xce4, 0]],
  [76409, [0xce5, 6]],
  [76410, [0xce5, 5]],
  [76411, [0xce5, 4]],
  [76412, [0xce5, 3]],
  [76413, [0xce5, 2]],
  [76414, [0xce5, 1]],
  [76415, [0xce5, 0]],
  [76416, [0xce6, 7]],
  [76417, [0xce6, 6]],
  [76418, [0xce6, 5]],
  [76419, [0xce6, 4]],
  [76420, [0xce6, 3]],
  [76422, [0xce6, 1]],
  [76450, [0xcea, 5]],
  [76451, [0xcea, 4]],
  [76452, [0xcea, 3]],
  [76453, [0xcea, 2]],
  [76454, [0xcea, 1]],
  [76455, [0xcea, 0]],
  [76456, [0xceb, 7]],
  [76500, [0xcf0, 3]],
  [76501, [0xcf0, 2]],
  [76502, [0xcf0, 1]],
  [76503, [0xcf0, 0]],
  [76504, [0xcf1, 7]],
  [76505, [0xcf1, 6]],
  [76506, [0xcf1, 5]],
  [76507, [0xcf1, 4]],
  [76508, [0xcf1, 3]],
  [76509, [0xcf1, 2]],
  [76510, [0xcf1, 1]],
  [76520, [0xcf3, 7]],
  [76521, [0xcf3, 6]],
  [76522, [0xcf3, 5]],
  [76523, [0xcf3, 4]],
  [76524, [0xcf3, 3]],
  [76550, [0xcf6, 1]],
  [76551, [0xcf6, 0]],
  [76652, [0xd03, 3]],
  [76653, [0xd03, 2]],
  [9410, [0x498, 5]],
  [9411, [0x498, 4]],
  [9413, [0x498, 2]],
  [2200, [0x113, 7]],
  [6001, [0x2ee, 6]],
  [2052, [0x100, 3]],
  [6010, [0x2ef, 5]],
  [100, [0xc, 3]],
  [31037000, [0x170f52, 7]],
  [31037010, [0x170f53, 5]],
  [66000, [0x7d0, 7]],
  [31030040, [0x170c69, 7]],
  [9000, [0x465, 7]],
  [1042369415, [0xa0a06, 0]],
  [4698, [0x24b, 5]],
  [9001, [0x465, 6]],
  [11102790, [0x153789, 1]],
  [2051, [0x100, 4]],
  [1054532702, [0x10aa74, 1]],
  [31032100, [0x170d6a, 3]],
  [2002, [0xfa, 5]],
  [60110, [0x4ef, 1]],
  [710620, [0x3680, 3]],
  [9020, [0x467, 3]],
  [6000, [0x2ee, 7]],
  [60230, [0x4fe, 1]],
  [31030800, [0x170cc8, 7]],
  [1042377000, [0xa0c44, 7]],
  [1042377010, [0xa0c45, 5]],
  [1042377300, [0xa0c69, 3]],
  [60130, [0x4f2, 5]],
  [1042377110, [0xa0c51, 1]],
  [1042378600, [0xa0d0c, 7]],
  [1042378601, [0xa0d0c, 6]],
  [1042372100, [0xa0ad9, 3]],
  [1040407000, [0x90515, 7]],
  [1040408500, [0x905d0, 3]],
  [1242330400, [0x189c7d, 7]],
  [1044337210, [0xb1022, 5]],
  [1047407920, [0xcc290, 7]],
  [1047408620, [0xcc2e7, 3]],
  [1041367000, [0x98021, 7]],
  [1041362100, [0x97eb6, 3]],
  [1042377070, [0xa0c4c, 1]],
  [1042377060, [0xa0c4b, 3]],
  [1042378501, [0xa0cff, 2]],
  [1042378506, [0xa0d00, 5]],
  [1044367200, [0xb1a62, 7]],
  [1041377000, [0x9838c, 7]],
  [1041377020, [0x9838e, 3]],
  [1041387200, [0x98710, 7]],
  [1041387100, [0x98703, 3]],
  [1041387050, [0x986fd, 5]],
  [1041387010, [0x986f8, 5]],
  [1041387030, [0x986fa, 1]],
  [1041387040, [0x986fc, 7]],
  [1042367030, [0xa08dc, 1]],
  [1042367040, [0xa08de, 7]],
  [1042367060, [0xa08e0, 3]],
  [1042367010, [0xa08da, 5]],
  [1042367050, [0xa08df, 5]],
  [1060420040, [0x13b85c, 7]],
  [1044368301, [0xb1aeb, 2]],
  [1041382100, [0x9858c, 3]],
  [1042362100, [0xa076e, 3]],
  [1042369249, [0xa09f2, 6]],
  [580300, [0x2fff, 3]],
  [1043367070, [0xa9199, 1]],
  [1043367020, [0xa9193, 3]],
  [1043367010, [0xa9192, 5]],
  [1043367040, [0xa9196, 7]],
  [1043367110, [0xa919e, 1]],
  [1060430041, [0x13bbc7, 6]],
  [1043368601, [0xa9259, 6]],
  [1043362100, [0xa9026, 3]],
  [1042387200, [0xa0fc8, 7]],
  [1042387030, [0xa0fb2, 1]],
  [1042387040, [0xa0fb4, 7]],
  [1042387050, [0xa0fb5, 5]],
  [1042387070, [0xa0fb7, 1]],
  [1042387080, [0xa0fb9, 7]],
  [1042387090, [0xa0fba, 5]],
  [1042387100, [0xa0fbb, 3]],
  [1042387110, [0xa0fbc, 1]],
  [1042387000, [0xa0faf, 7]],
  [1042387010, [0xa0fb0, 5]],
  [1042387120, [0xa0fbe, 7]],
  [1042387020, [0xa0fb1, 3]],
  [1042387140, [0xa0fc0, 3]],
  [1042387600, [0xa0ffa, 7]],
  [1043377020, [0xa94fe, 3]],
  [1043377000, [0xa94fc, 7]],
  [1043377010, [0xa94fd, 5]],
  [1060430040, [0x13bbc7, 7]],
  [1042382100, [0xa0e44, 3]],
  [6080, [0x2f8, 7]],
  [1036500800, [0x702d3, 7]],
  [31030800, [0x170cc8, 7]],
  [1042380850, [0xa0e25, 5]],
  [30110800, [0x16ac1a, 7]],
  [1044350800, [0xb154e, 7]],
  [1042370800, [0xa0ab4, 7]],
  [1042380800, [0xa0e1f, 7]],
  [31150800, [0x174184, 7]],
  [30020800, [0x16848d, 7]],
  [1043360800, [0xa9001, 7]],
  [10000800, [0x151c33, 7]],
  [10010800, [0x152098, 7]],
  [30040800, [0x168d57, 7]],
  [31170800, [0x1745e9, 7]],
  [1044360800, [0xb18b9, 7]],
  [10000850, [0x151c39, 5]],
  [1043370800, [0xa936c, 7]],
  [31000800, [0x16ff99, 7]],
  [18000850, [0x15b608, 5]],
  [32010800, [0x1787d4, 7]],
  [1045390800, [0xbabb2, 7]],
  [1042360800, [0xa0749, 7]],
  [1042330800, [0x9fd08, 7]],
  [30000800, [0x167bc3, 7]],
  [1044320800, [0xb0b0d, 7]],
  [1043330800, [0xa85c0, 7]],
  [30010800, [0x168028, 7]],
  [1043300800, [0xa7b7f, 7]],
  [31020800, [0x170863, 7]],
  [1044320850, [0xb0b13, 5]],
  [31010800, [0x1703fe, 7]],
  [1038410800, [0x7f580, 7]],
  [1033420800, [0x54d53, 7]],
  [1037460800, [0x77ddf, 7]],
  [30050850, [0x1691c2, 5]],
  [31050800, [0x171592, 7]],
  [1033450800, [0x55794, 7]],
  [30050800, [0x1691bc, 7]],
  [31040800, [0x17112d, 7]],
  [32020800, [0x178c39, 7]],
  [31060800, [0x1719f7, 7]],
  [1036450800, [0x6f1bc, 7]],
  [1037420800, [0x77033, 7]],
  [1038480800, [0x80d6d, 7]],
  [1033430800, [0x550be, 7]],
  [30060800, [0x169621, 7]],
  [1034500800, [0x5f163, 7]],
  [1034450800, [0x5e04c, 7]],
  [1036480800, [0x6fbfd, 7]],
  [1039430800, [0x8850e, 7]],
  [1035420800, [0x65ec3, 7]],
  [1035500800, [0x67a1b, 7]],
  [1034480800, [0x5ea8d, 7]],
  [30030800, [0x1688f2, 7]],
  [14000800, [0x158146, 7]],
  [14000850, [0x15814c, 5]],
  [39200800, [0x15dd8f, 7]],
  [1049380800, [0xdcb27, 7]],
  [1051360800, [0xed5c1, 7]],
  [1049370850, [0xdc7c2, 5]],
  [1048370800, [0xd3f04, 7]],
  [1050400800, [0xe5ab5, 7]],
  [30140800, [0x16b949, 7]],
  [32080800, [0x17a232, 7]],
  [31210800, [0x17577d, 7]],
  [1048400800, [0xd4945, 7]],
  [32070800, [0x179dcd, 7]],
  [1049370800, [0xdc7bc, 7]],
  [1049390800, [0xdce92, 7]],
  [1047400800, [0xcc08d, 7]],
  [1049390850, [0xdce98, 5]],
  [31100800, [0x172b8b, 7]],
  [1048410800, [0xd4cb0, 7]],
  [1051430800, [0xeedae, 7]],
  [1052410800, [0xf6f90, 7]],
  [34130800, [0x16310e, 7]],
  [1052410850, [0xf6f96, 5]],
  [1052560800, [0xfa2d5, 7]],
  [31110800, [0x172ff0, 7]],
  [1041520800, [0x9b541, 7]],
  [30080800, [0x169eeb, 7]],
  [31190800, [0x174eb3, 7]],
  [1040520800, [0x92c89, 7]],
  [32050800, [0x179968, 7]],
  [1038510800, [0x817ae, 7]],
  [1039540800, [0x8aaa7, 7]],
  [30070800, [0x169a86, 7]],
  [1041500800, [0x9ae6b, 7]],
  [1039500800, [0x89cfb, 7]],
  [1042550800, [0xa483a, 7]],
  [31190850, [0x174eb9, 5]],
  [1039510800, [0x8a066, 7]],
  [31180800, [0x174a4e, 7]],
  [30120800, [0x16b07f, 7]],
  [1040530800, [0x92ff4, 7]],
  [32040800, [0x17909e, 7]],
  [1038520800, [0x81b19, 7]],
  [1041510800, [0x9b1d6, 7]],
  [1043530800, [0xaca1c, 7]],
  [30100800, [0x16a7b5, 7]],
  [1045520800, [0xbd821, 7]],
  [34140850, [0x163579, 5]],
  [30130800, [0x16b4e4, 7]],
  [11000850, [0x152dcd, 5]],
  [35000800, [0x15d060, 7]],
  [11000800, [0x152dc7, 7]],
  [16000860, [0x159bab, 3]],
  [1037530800, [0x795cc, 7]],
  [31090800, [0x172726, 7]],
  [1036540800, [0x7107f, 7]],
  [16000800, [0x159ba4, 7]],
  [16000850, [0x159baa, 5]],
  [31070800, [0x171e5c, 7]],
  [1035530800, [0x6845c, 7]],
  [30090800, [0x16a350, 7]],
  [1037540810, [0x79938, 5]],
  [30170800, [0x16c678, 7]],
  [1054560800, [0x10b445, 7]],
  [1051570800, [0xf1d88, 7]],
  [1050570800, [0xe94d0, 7]],
  [1052520800, [0xf9529, 7]],
  [31220800, [0x175be2, 7]],
  [30180800, [0x16cadd, 7]],
  [1053560800, [0x102b8d, 7]],
  [13000830, [0x15741a, 1]],
  [13000850, [0x15741d, 5]],
  [13000800, [0x157417, 7]],
  [1049520800, [0xdfb01, 7]],
  [1048510800, [0xd6ede, 7]],
  [30200800, [0x16d3a7, 7]],
  [32110800, [0x17a697, 7]],
  [1048570800, [0xd8360, 7]],
  [1050560800, [0xe9165, 7]],
  [31120800, [0x173455, 7]],
  [1248550800, [0x1abd9b, 7]],
  [1050570850, [0xe94d6, 5]],
  [30190800, [0x16cf42, 7]],
  [15000850, [0x158e7b, 5]],
  [15000800, [0x158e75, 7]],
  [12080800, [0x156b4d, 7]],
  [12020830, [0x1550f2, 1]],
  [12050800, [0x155e1e, 7]],
  [12010800, [0x154c8a, 7]],
  [12020850, [0x1550f5, 5]],
  [12090800, [0x156fb2, 7]],
  [12020800, [0x1550ef, 7]],
  [12030390, [0x155520, 1]],
  [12030800, [0x155554, 7]],
  [12030850, [0x15555a, 5]],
  [12040800, [0x1559b9, 7]],
  [12010850, [0x154c90, 5]],
  [11050800, [0x15322c, 7]],
  [11050850, [0x153232, 5]],
  [19000810, [0x15c332, 5]],
  [71190, [0xa58, 1]],
  [76101, [0xcbe, 2]],
  [76100, [0xcbe, 3]],
  [76111, [0xcbf, 0]],
  [76120, [0xcc1, 7]],
  [76103, [0xcbe, 0]],
  [76104, [0xcbf, 7]],
  [76105, [0xcbf, 6]],
  [76106, [0xcbf, 5]],
  [76108, [0xcbf, 3]],
  [76110, [0xcbf, 1]],
  [76113, [0xcc0, 6]],
  [76114, [0xcc0, 5]],
  [76116, [0xcc0, 3]],
  [76119, [0xcc0, 0]],
  [73002, [0xb3b, 5]],
  [73004, [0xb3b, 3]],
  [73103, [0xb47, 0]],
  [73115, [0xb49, 4]],
  [73100, [0xb47, 3]],
  [73117, [0xb49, 2]],
  [73201, [0xb54, 6]],
  [71800, [0xaa5, 7]],
  [71801, [0xaa5, 6]],
  [76102, [0xcbe, 1]],
  [71002, [0xa41, 5]],
  [71001, [0xa41, 6]],
  [76118, [0xcc0, 1]],
  [76117, [0xcc0, 2]],
  [73011, [0xb3c, 4]],
  [73410, [0xb6e, 5]],
  [73412, [0xb6e, 3]],
  [76150, [0xcc4, 1]],
  [76151, [0xcc4, 0]],
  [76152, [0xcc5, 7]],
  [76153, [0xcc5, 6]],
  [76154, [0xcc5, 5]],
  [76155, [0xcc5, 4]],
  [76156, [0xcc5, 3]],
  [76162, [0xcc6, 5]],
  [76157, [0xcc5, 2]],
  [76158, [0xcc5, 1]],
  [76159, [0xcc5, 0]],
  [76160, [0xcc6, 7]],
  [76161, [0xcc6, 6]],
  [73001, [0xb3b, 6]],
  [73000, [0xb3b, 7]],
  [73101, [0xb47, 2]],
  [73102, [0xb47, 1]],
  [73200, [0xb54, 7]],
  [71008, [0xa42, 7]],
  [71003, [0xa41, 4]],
  [71004, [0xa41, 3]],
  [71005, [0xa41, 2]],
  [71006, [0xa41, 1]],
  [71007, [0xa41, 0]],
  [71000, [0xa41, 7]],
  [76200, [0xccb, 7]],
  [76202, [0xccb, 5]],
  [76201, [0xccb, 6]],
  [76204, [0xccb, 3]],
  [76217, [0xccd, 6]],
  [76223, [0xccd, 0]],
  [76222, [0xccd, 1]],
  [76221, [0xccd, 2]],
  [76244, [0xcd0, 3]],
  [76206, [0xccb, 1]],
  [76203, [0xccb, 4]],
  [76205, [0xccb, 2]],
  [76225, [0xcce, 6]],
  [76216, [0xccd, 7]],
  [76224, [0xcce, 7]],
  [76237, [0xccf, 2]],
  [76234, [0xccf, 5]],
  [76236, [0xccf, 3]],
  [76219, [0xccd, 4]],
  [76245, [0xcd0, 2]],
  [76226, [0xcce, 5]],
  [76247, [0xcd0, 0]],
  [76218, [0xccd, 5]],
  [76215, [0xccc, 0]],
  [76220, [0xccd, 3]],
  [76243, [0xcd0, 4]],
  [76242, [0xcd0, 5]],
  [76210, [0xccc, 5]],
  [76233, [0xccf, 6]],
  [76214, [0xccc, 1]],
  [76231, [0xcce, 0]],
  [76230, [0xcce, 1]],
  [76212, [0xccc, 3]],
  [76213, [0xccc, 2]],
  [76232, [0xccf, 7]],
  [76211, [0xccc, 4]],
  [76241, [0xcd0, 6]],
  [76227, [0xcce, 4]],
  [73106, [0xb48, 5]],
  [76238, [0xccf, 1]],
  [73005, [0xb3b, 2]],
  [73006, [0xb3b, 1]],
  [73105, [0xb48, 6]],
  [73421, [0xb6f, 2]],
  [76228, [0xcce, 3]],
  [76229, [0xcce, 2]],
  [73202, [0xb54, 5]],
  [73003, [0xb3b, 4]],
  [73104, [0xb48, 7]],
  [73420, [0xb6f, 3]],
  [76235, [0xccf, 4]],
  [73422, [0xb6f, 1]],
  [76208, [0xccc, 7]],
  [76240, [0xcd0, 7]],
  [76207, [0xccb, 0]],
  [76239, [0xccf, 0]],
  [76209, [0xccc, 6]],
  [73900, [0xbab, 3]],
  [73901, [0xbab, 2]],
  [73902, [0xbab, 1]],
  [76252, [0xcd1, 3]],
  [76251, [0xcd1, 4]],
  [76250, [0xcd1, 5]],
  [71402, [0xa73, 5]],
  [71401, [0xa73, 6]],
  [71400, [0xa73, 7]],
  [71403, [0xa73, 4]],
  [76300, [0xcd7, 3]],
  [76303, [0xcd7, 0]],
  [76301, [0xcd7, 2]],
  [76306, [0xcd8, 5]],
  [76302, [0xcd7, 1]],
  [76304, [0xcd8, 7]],
  [76305, [0xcd8, 6]],
  [76307, [0xcd8, 4]],
  [76321, [0xcda, 6]],
  [76320, [0xcda, 7]],
  [76313, [0xcd9, 6]],
  [76308, [0xcd8, 3]],
  [73205, [0xb54, 2]],
  [76322, [0xcda, 5]],
  [73204, [0xb54, 3]],
  [73118, [0xb49, 1]],
  [73119, [0xb49, 0]],
  [73008, [0xb3c, 7]],
  [73012, [0xb3c, 3]],
  [76350, [0xcdd, 1]],
  [76356, [0xcde, 3]],
  [76351, [0xcdd, 0]],
  [73009, [0xb3c, 6]],
  [76352, [0xcde, 7]],
  [76357, [0xcde, 2]],
  [76353, [0xcde, 6]],
  [73107, [0xb48, 4]],
  [76354, [0xcde, 5]],
  [76355, [0xcde, 4]],
  [73109, [0xb48, 2]],
  [73007, [0xb3b, 0]],
  [73013, [0xb3c, 2]],
  [73010, [0xb3c, 5]],
  [76314, [0xcd9, 5]],
  [73430, [0xb70, 1]],
  [73432, [0xb71, 7]],
  [76311, [0xcd8, 0]],
  [76310, [0xcd8, 1]],
  [76312, [0xcd9, 7]],
  [76309, [0xcd8, 2]],
  [73431, [0xb70, 0]],
  [71606, [0xa8c, 1]],
  [71605, [0xa8c, 2]],
  [71604, [0xa8c, 3]],
  [71603, [0xa8c, 4]],
  [71600, [0xa8c, 7]],
  [71607, [0xa8c, 0]],
  [71601, [0xa8c, 6]],
  [71602, [0xa8c, 5]],
  [71103, [0xa4d, 0]],
  [71102, [0xa4d, 1]],
  [71101, [0xa4d, 2]],
  [71100, [0xa4d, 3]],
  [71109, [0xa4e, 2]],
  [71108, [0xa4e, 3]],
  [71107, [0xa4e, 4]],
  [71105, [0xa4e, 6]],
  [71104, [0xa4e, 7]],
  [73500, [0xb79, 3]],
  [73502, [0xb79, 1]],
  [73504, [0xb7a, 7]],
  [73503, [0xb79, 0]],
  [73501, [0xb79, 2]],
  [71125, [0xa50, 2]],
  [71122, [0xa50, 5]],
  [71120, [0xa50, 7]],
  [71121, [0xa50, 6]],
  [71123, [0xa50, 4]],
  [71124, [0xa50, 3]],
  [71900, [0xab1, 3]],
  [76403, [0xce4, 4]],
  [76405, [0xce4, 2]],
  [76404, [0xce4, 3]],
  [76415, [0xce5, 0]],
  [76418, [0xce6, 5]],
  [76402, [0xce4, 5]],
  [76401, [0xce4, 6]],
  [76414, [0xce5, 1]],
  [76416, [0xce6, 7]],
  [76400, [0xce4, 7]],
  [76409, [0xce5, 6]],
  [76411, [0xce5, 4]],
  [73120, [0xb4a, 7]],
  [73015, [0xb3c, 0]],
  [76420, [0xce6, 3]],
  [76410, [0xce5, 5]],
  [73207, [0xb54, 0]],
  [73121, [0xb4a, 6]],
  [76417, [0xce6, 6]],
  [73014, [0xb3c, 1]],
  [73257, [0xb5b, 6]],
  [76419, [0xce6, 4]],
  [73208, [0xb55, 7]],
  [76422, [0xce6, 1]],
  [73016, [0xb3d, 7]],
  [76406, [0xce4, 1]],
  [76407, [0xce4, 0]],
  [76412, [0xce5, 3]],
  [76413, [0xce5, 2]],
  [76454, [0xcea, 1]],
  [73440, [0xb72, 7]],
  [73441, [0xb72, 6]],
  [73110, [0xb48, 1]],
  [76452, [0xcea, 3]],
  [76450, [0xcea, 5]],
  [76456, [0xceb, 7]],
  [76453, [0xcea, 2]],
  [73460, [0xb74, 3]],
  [76451, [0xcea, 4]],
  [76455, [0xcea, 0]],
  [73111, [0xb48, 0]],
  [73451, [0xb73, 4]],
  [73450, [0xb73, 5]],
  [76500, [0xcf0, 3]],
  [76502, [0xcf0, 1]],
  [73020, [0xb3d, 3]],
  [76503, [0xcf0, 0]],
  [76522, [0xcf3, 5]],
  [76524, [0xcf3, 3]],
  [76523, [0xcf3, 4]],
  [76505, [0xcf1, 6]],
  [76504, [0xcf1, 7]],
  [76521, [0xcf3, 6]],
  [73122, [0xb4a, 5]],
  [76520, [0xcf3, 7]],
  [76501, [0xcf0, 2]],
  [76507, [0xcf1, 4]],
  [76509, [0xcf1, 2]],
  [76508, [0xcf1, 3]],
  [76510, [0xcf1, 1]],
  [76506, [0xcf1, 5]],
  [73018, [0xb3d, 5]],
  [73017, [0xb3d, 6]],
  [76653, [0xd03, 2]],
  [73112, [0xb49, 7]],
  [76550, [0xcf6, 1]],
  [73019, [0xb3d, 4]],
  [76551, [0xcf6, 0]],
  [76652, [0xd03, 3]],
  [73211, [0xb55, 4]],
  [71506, [0xa80, 5]],
  [71505, [0xa80, 6]],
  [71507, [0xa80, 4]],
  [71508, [0xa80, 3]],
  [71503, [0xa7f, 0]],
  [71502, [0xa7f, 1]],
  [71504, [0xa80, 7]],
  [71500, [0xa7f, 3]],
  [71501, [0xa7f, 2]],
  [71310, [0xa67, 1]],
  [71303, [0xa66, 0]],
  [71304, [0xa67, 7]],
  [71306, [0xa67, 5]],
  [71302, [0xa66, 1]],
  [71308, [0xa67, 3]],
  [71309, [0xa67, 2]],
  [71307, [0xa67, 4]],
  [71301, [0xa66, 2]],
  [71300, [0xa66, 3]],
  [71305, [0xa67, 6]],
  [71213, [0xa5b, 2]],
  [71212, [0xa5b, 3]],
  [71211, [0xa5b, 4]],
  [71240, [0xa5f, 7]],
  [71210, [0xa5b, 5]],
  [71214, [0xa5b, 1]],
  [71215, [0xa5b, 0]],
  [71219, [0xa5c, 4]],
  [71218, [0xa5c, 5]],
  [71216, [0xa5c, 7]],
  [71271, [0xa62, 0]],
  [71224, [0xa5d, 7]],
  [71225, [0xa5d, 6]],
  [71220, [0xa5c, 3]],
  [71221, [0xa5c, 2]],
  [71226, [0xa5d, 5]],
  [71227, [0xa5d, 4]],
  [71222, [0xa5c, 1]],
  [71270, [0xa62, 1]],
  [71223, [0xa5c, 0]],
  [71250, [0xa60, 5]],
  [71252, [0xa60, 3]],
  [71253, [0xa60, 2]],
  [71251, [0xa60, 4]],
  [71235, [0xa5e, 4]],
  [71233, [0xa5e, 6]],
  [71232, [0xa5e, 7]],
  [71230, [0xa5d, 1]],
  [71231, [0xa5d, 0]],
  [71234, [0xa5e, 5]],
  [62007, [0x5dc, 0]],
  [62006, [0x5dc, 1]],
  [62005, [0x5dc, 2]],
  [62004, [0x5dc, 3]],
  [62012, [0x5dd, 3]],
  [62011, [0x5dd, 4]],
  [62010, [0x5dd, 5]],
  [62009, [0x5dd, 6]],
  [62008, [0x5dd, 7]],
  [62022, [0x5de, 1]],
  [62021, [0x5de, 2]],
  [62020, [0x5de, 3]],
  [62031, [0x5df, 0]],
  [62030, [0x5df, 1]],
  [62032, [0x5e0, 7]],
  [62041, [0x5e1, 6]],
  [62040, [0x5e1, 7]],
  [62052, [0x5e2, 3]],
  [62051, [0x5e2, 4]],
  [62050, [0x5e2, 5]],
  [62063, [0x5e3, 0]],
  [62062, [0x5e3, 1]],
  [62061, [0x5e3, 2]],
  [62060, [0x5e3, 3]],
  [62064, [0x5e4, 7]],
  [62103, [0x5e8, 0]],
  [62102, [0x5e8, 1]],
  [82001, [0xfa0, 6]],
  [65600, [0x79e, 7]],
  [65610, [0x79f, 5]],
  [65620, [0x7a0, 3]],
  [65630, [0x7a1, 1]],
  [65640, [0x7a3, 7]],
  [65650, [0x7a4, 5]],
  [65660, [0x7a5, 3]],
  [65670, [0x7a6, 1]],
  [65680, [0x7a8, 7]],
  [65690, [0x7a9, 5]],
  [65700, [0x7aa, 3]],
  [65710, [0x7ab, 1]],
  [65720, [0x7ad, 7]],
  [67610, [0x899, 5]],
  [67600, [0x898, 7]],
  [67650, [0x89e, 5]],
  [67640, [0x89d, 7]],
  [67630, [0x89b, 1]],
  [67130, [0x85d, 5]],
  [68230, [0x8e6, 1]],
  [67000, [0x84d, 7]],
  [67110, [0x85a, 1]],
  [67010, [0x84e, 5]],
  [67800, [0x8b1, 7]],
  [67830, [0x8b4, 1]],
  [67020, [0x84f, 3]],
  [67050, [0x853, 5]],
  [67880, [0x8bb, 7]],
  [67430, [0x882, 1]],
  [67030, [0x850, 1]],
  [67220, [0x868, 3]],
  [67060, [0x854, 3]],
  [67080, [0x857, 7]],
  [67870, [0x8b9, 1]],
  [67900, [0x8bd, 3]],
  [67290, [0x871, 5]],
  [67100, [0x859, 3]],
  [67270, [0x86e, 1]],
  [67070, [0x855, 1]],
  [67230, [0x869, 1]],
  [67120, [0x85c, 7]],
  [67890, [0x8bc, 5]],
  [67090, [0x858, 5]],
  [67910, [0x8be, 1]],
  [67200, [0x866, 7]],
  [67210, [0x867, 5]],
  [67280, [0x870, 7]],
  [67260, [0x86d, 3]],
  [67310, [0x873, 1]],
  [67300, [0x872, 3]],
  [67250, [0x86c, 5]],
  [68000, [0x8ca, 7]],
  [68010, [0x8cb, 5]],
  [68030, [0x8cd, 1]],
  [68020, [0x8cc, 3]],
  [68200, [0x8e3, 7]],
  [68220, [0x8e5, 3]],
  [68210, [0x8e4, 5]],
  [67840, [0x8b6, 7]],
  [67850, [0x8b7, 5]],
  [67860, [0x8b8, 3]],
  [67920, [0x8c0, 7]],
  [67410, [0x880, 5]],
  [67450, [0x885, 5]],
  [67480, [0x889, 7]],
  [67400, [0x87f, 7]],
  [67420, [0x881, 3]],
  [67460, [0x886, 3]],
  [67470, [0x887, 1]],
  [67440, [0x884, 7]],
  [68400, [0x8fc, 7]],
  [68410, [0x8fd, 5]],
  [10000040, [0x151bd4, 7]],
  [10000041, [0x151bd4, 6]],
  [10000042, [0x151bd4, 5]],
  [10000043, [0x151bd4, 4]],
  [10000044, [0x151bd4, 3]],
  [10000045, [0x151bd4, 2]],
  [11000040, [0x152d68, 7]],
  [11000041, [0x152d68, 6]],
  [11000042, [0x152d68, 5]],
  [11000043, [0x152d68, 4]],
  [11000044, [0x152d68, 3]],
  [11050040, [0x1531cd, 7]],
  [11050041, [0x1531cd, 6]],
  [12010040, [0x154c2b, 7]],
  [12010041, [0x154c2b, 6]],
  [12010042, [0x154c2b, 5]],
  [12010043, [0x154c2b, 4]],
  [12010044, [0x154c2b, 3]],
  [12010045, [0x154c2b, 2]],
  [12010046, [0x154c2b, 1]],
  [12020040, [0x155090, 7]],
  [12020041, [0x155090, 6]],
  [12020042, [0x155090, 5]],
  [12020043, [0x155090, 4]],
  [12020044, [0x155090, 3]],
  [12020045, [0x155090, 2]],
  [12020046, [0x155090, 1]],
  [12030040, [0x1554f5, 7]],
  [12030041, [0x1554f5, 6]],
  [12030042, [0x1554f5, 5]],
  [12030043, [0x1554f5, 4]],
  [12030044, [0x1554f5, 3]],
  [12050040, [0x155dbf, 7]],
  [12050041, [0x155dbf, 6]],
  [12050042, [0x155dbf, 5]],
  [12070040, [0x156689, 7]],
  [12070041, [0x156689, 6]],
  [13000040, [0x1573b8, 7]],
  [13000041, [0x1573b8, 6]],
  [13000042, [0x1573b8, 5]],
  [13000043, [0x1573b8, 4]],
  [13000044, [0x1573b8, 3]],
  [13000045, [0x1573b8, 2]],
  [13000046, [0x1573b8, 1]],
  [13000047, [0x1573b8, 0]],
  [14000040, [0x1580e7, 7]],
  [14000041, [0x1580e7, 6]],
  [14000042, [0x1580e7, 5]],
  [14000043, [0x1580e7, 4]],
  [15000040, [0x158e16, 7]],
  [15000041, [0x158e16, 6]],
  [15000042, [0x158e16, 5]],
  [15000044, [0x158e16, 3]],
  [15000045, [0x158e16, 2]],
  [15000046, [0x158e16, 1]],
  [15000047, [0x158e16, 0]],
  [15000049, [0x158e17, 6]],
  [16000040, [0x159b45, 7]],
  [16000041, [0x159b45, 6]],
  [16000042, [0x159b45, 5]],
  [16000043, [0x159b45, 4]],
  [16000044, [0x159b45, 3]],
  [19000040, [0x15c2d2, 7]],
  [30000040, [0x167b64, 7]],
  [30010040, [0x167fc9, 7]],
  [30020040, [0x16842e, 7]],
  [30110040, [0x16abbb, 7]],
  [30040040, [0x168cf8, 7]],
  [30050040, [0x16915d, 7]],
  [30030040, [0x168893, 7]],
  [30060040, [0x1695c2, 7]],
  [30080040, [0x169e8c, 7]],
  [30090040, [0x16a2f1, 7]],
  [30100040, [0x16a756, 7]],
  [30120040, [0x16b020, 7]],
  [30070040, [0x169a27, 7]],
  [30140040, [0x16b8ea, 7]],
  [30150040, [0x16bd4f, 7]],
  [30160040, [0x16c1b4, 7]],
  [30170040, [0x16c619, 7]],
  [30180040, [0x16ca7e, 7]],
  [30190040, [0x16cee3, 7]],
  [30200040, [0x16d348, 7]],
  [31020040, [0x170804, 7]],
  [31010040, [0x17039f, 7]],
  [31000040, [0x16ff3a, 7]],
  [31030040, [0x170c69, 7]],
  [31150040, [0x174125, 7]],
  [31170040, [0x17458a, 7]],
  [31040040, [0x1710ce, 7]],
  [31050040, [0x171533, 7]],
  [31060040, [0x171998, 7]],
  [31070040, [0x171dfd, 7]],
  [31090040, [0x1726c7, 7]],
  [31180040, [0x1749ef, 7]],
  [31190040, [0x174e54, 7]],
  [31210040, [0x17571e, 7]],
  [31100040, [0x172b2c, 7]],
  [31200040, [0x1752b9, 7]],
  [31110040, [0x172f91, 7]],
  [31120040, [0x1733f6, 7]],
  [31220040, [0x175b83, 7]],
  [32000040, [0x178310, 7]],
  [32010040, [0x178775, 7]],
  [32020040, [0x178bda, 7]],
  [32040040, [0x17903f, 7]],
  [32050040, [0x179909, 7]],
  [32070040, [0x179d6e, 7]],
  [32080040, [0x17a1d3, 7]],
  [32110040, [0x17a638, 7]],
  [34100040, [0x162380, 7]],
  [34110040, [0x1627e5, 7]],
  [34120040, [0x162c4a, 7]],
  [34120041, [0x162c4a, 6]],
  [34130040, [0x1630af, 7]],
  [35000040, [0x15d001, 7]],
  [35000041, [0x15d001, 6]],
  [35000042, [0x15d001, 5]],
  [39200040, [0x15dd30, 7]],
  [39200041, [0x15dd30, 6]],
  [1060410040, [0x13b4f1, 7]],
  [1060420040, [0x13b85c, 7]],
  [1060430040, [0x13bbc7, 7]],
  [1060430041, [0x13bbc7, 6]],
  [1060430042, [0x13bbc7, 5]],
  [1060430043, [0x13bbc7, 4]],
  [1060440040, [0x13bf32, 7]],
  [1060330040, [0x139999, 7]],
  [1060340040, [0x139d04, 7]],
  [1060340041, [0x139d04, 6]],
  [1060340043, [0x139d04, 4]],
  [1060350040, [0x13a06f, 7]],
  [1060380040, [0x13aab0, 7]],
  [1035530040, [0x683fd, 7]],
  [1036520040, [0x7094a, 7]],
  [1036540040, [0x71020, 7]],
  [1036540041, [0x71020, 6]],
  [1037530040, [0x7956d, 7]],
  [1038520040, [0x81aba, 7]],
  [1039540040, [0x8aa48, 7]],
  [1040530040, [0x92f95, 7]],
  [1042540040, [0xa4470, 7]],
  [1044530040, [0xb5275, 7]],
  [1045520040, [0xbd7c2, 7]],
  [1046400040, [0xc3776, 7]],
  [1047400040, [0xcc02e, 7]],
  [1048370040, [0xd3ea5, 7]],
  [1049380040, [0xdcac8, 7]],
  [1049380041, [0xdcac8, 6]],
  [1050400040, [0xe5a56, 7]],
  [1051360040, [0xed562, 7]],
  [1051370040, [0xed8cd, 7]],
  [1051400040, [0xee30e, 7]],
  [1052410040, [0xf6f31, 7]],
  [1047510840, [0xce62b, 7]],
  [1053570840, [0x102efd, 7]],
  [1052530840, [0xf9899, 7]],
  [1052570840, [0xfa645, 7]],
  [1051570840, [0xf1d8d, 7]],
  [1051570841, [0xf1d8d, 6]],
  [1049560840, [0xe08b2, 7]],
  [1049570840, [0xe0c1d, 7]],
  [60370, [0x510, 5]],
  [60350, [0x50d, 1]],
  [60360, [0x50f, 7]],
];
