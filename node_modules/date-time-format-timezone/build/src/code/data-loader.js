'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = dataloader;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function getHistoryFromTriplet(indices, triplet) {
    return {
        until: parseInt(indices.timeStamps[parseInt(triplet[0], 32)], 32) * 1000,

        offset: indices.offsets[parseInt(triplet[1], 32)],

        isdst: !!parseInt(triplet[2], 10)
    };
}

function reduceToTriplets(array) {
    var result = [];
    var i = 0;

    while (i < array.length) {
        result.push([array[i], array[i + 1], array[i + 2]]);
        i += 3;
    }

    return result;
}

function unpackHistory(indices, historyStringCSV) {
    var encodedIndexList = historyStringCSV.split(',');
    var count = encodedIndexList.length;

    if (count % 3 !== 0) {
        throw new Error('wrong length of history Array, must be multiple of 3');
    }

    var history = reduceToTriplets(encodedIndexList).map(function (triplet) {
        return getHistoryFromTriplet(indices, triplet);
    });

    if (count / 3 !== history.length) {
        throw new Error('failed to harvest all data!!');
    }

    return history;
}

function enrichMetaZoneMapWithEquivalentZones(equivalentIanaTimeZones) {
    var globalSpace = this.globalSpace;

    if (!(globalSpace && globalSpace.Intl._metaZoneData)) {
        return;
    }

    var metaZoneData = globalSpace.Intl._metaZoneData;
    var foundMetaZone = null;

    equivalentIanaTimeZones.forEach(function (ianaTimeZone) {
        if (metaZoneData.get(ianaTimeZone)) {
            foundMetaZone = metaZoneData.get(ianaTimeZone);
        }
    });

    if (!foundMetaZone) {
        return;
    }

    var allMetaZoneData = metaZoneData.get();
    equivalentIanaTimeZones.forEach(function (ianaTimeZone) {
        if (!metaZoneData.get(ianaTimeZone)) {
            allMetaZoneData[ianaTimeZone] = foundMetaZone;
        }
    });
}

function loadTimeZoneData(packedTzData) {
    var _this = this;

    if (!packedTzData || !Array.isArray(packedTzData.zoneDefs) || !Array.isArray(packedTzData.timeStamps) || !Array.isArray(packedTzData.offsets)) {
        throw new Error('loadTimeZoneData: rejected packedTzData, packedTzData is not in right shape.');
    }

    var indices = {
        timeStamps: packedTzData.timeStamps,
        offsets: packedTzData.offsets
    };

    packedTzData.zoneDefs.forEach(function (zoneDef) {
        var zoneDefSplit = zoneDef.split('||');
        var equivalentIanaTimeZones = zoneDefSplit[0].split(',');
        var historyString = zoneDefSplit[1];
        var ianaTimeZoneHistoryList = unpackHistory(indices, historyString);

        equivalentIanaTimeZones.forEach(function (ianaTimeZone) {
            _this.value[ianaTimeZone] = ianaTimeZoneHistoryList;
        });

        _this.enrichMetaZoneMapWithEquivalentZones(equivalentIanaTimeZones);
    });
}

function getCLDRZoneNamesFromQuadruplet(zoneNameIndex, strQuadruplet) {
    var quadruplet = strQuadruplet.split('|');
    var lookupIndex = function lookupIndex(w) {
        return zoneNameIndex[parseInt(w, 32)];
    };

    return {
        long: {
            standard: quadruplet[0].split(',').filter(function (w) {
                return !!w;
            }).map(lookupIndex).join(''),
            daylight: quadruplet[1].split(',').filter(function (w) {
                return !!w;
            }).map(lookupIndex).join('')
        },
        short: {
            standard: quadruplet[2].split(',').filter(function (w) {
                return !!w;
            }).map(lookupIndex).join(''),
            daylight: quadruplet[3].split(',').filter(function (w) {
                return !!w;
            }).map(lookupIndex).join('')
        }
    };
}

function loadLocaleData(packedCLDRZoneData) {
    var _this2 = this;

    if (!packedCLDRZoneData || !packedCLDRZoneData.locales || !Array.isArray(packedCLDRZoneData.zoneNameIndex)) {
        throw new Error('loadLocaleData: rejected data, data is not in right shape.');
    }

    var decodeQuadruplet = function decodeQuadruplet(strQuadruplet) {
        return getCLDRZoneNamesFromQuadruplet(packedCLDRZoneData.zoneNameIndex, strQuadruplet);
    };

    Object.keys(packedCLDRZoneData.locales).forEach(function (locale) {
        var metaZones = packedCLDRZoneData.locales[locale].metazone;
        Object.keys(metaZones).forEach(function (metaZone) {
            metaZones[metaZone] = decodeQuadruplet(metaZones[metaZone]);
        });

        var ianaTimeZones = packedCLDRZoneData.locales[locale].zone;
        Object.keys(ianaTimeZones).forEach(function (ianaTimeZone) {
            ianaTimeZones[ianaTimeZone] = decodeQuadruplet(ianaTimeZones[ianaTimeZone]);
        });

        _this2.value[locale] = packedCLDRZoneData.locales[locale];
    });

    Object.keys(packedCLDRZoneData.locales).forEach(function (locale) {
        var localeItems = locale.split('-');

        for (var i = 0; i < localeItems.length - 1; i++) {
            var generalLocale = localeItems.slice(0, localeItems.length - i - 1).join('-');

            if (!_this2.value[generalLocale]) {
                _this2.value[generalLocale] = _this2.value[locale];
            }
        }
    });
}

function getLocale(locale) {
    if (this.get(locale)) {
        return this.get(locale);
    }

    var localeItems = locale.split('-');
    var fallbackLocales = [];

    for (var i = 0; i < localeItems.length - 1; i++) {
        fallbackLocales.push(localeItems.slice(0, localeItems.length - i - 1).join('-'));
    }

    for (var j = 0; j < fallbackLocales.length; j++) {
        if (this.get(fallbackLocales[j])) {
            return this.get(fallbackLocales[j]);
        }
    }

    return undefined;
}

var Loader = function Loader(loaderFunction, extraMethods) {
    var _this3 = this;

    _classCallCheck(this, Loader);

    this.value = {};
    this.load = loaderFunction || function (json) {
        this.value = json;
    };

    if (extraMethods) {
        Object.keys(extraMethods).forEach(function (name) {
            return _this3[name] = extraMethods[name];
        });
    }

    this.get = function (key) {
        if (key === undefined) {
            return this.value;
        }

        return this.value[key];
    };
};

function dataloader(globalSpace) {
    if (globalSpace.Intl) {
        globalSpace.Intl._metaZoneData = new Loader();
        globalSpace.Intl._localeData = new Loader(loadLocaleData, {
            getLocale: getLocale
        });
        globalSpace.Intl._timeZoneData = new Loader(loadTimeZoneData, {
            enrichMetaZoneMapWithEquivalentZones: enrichMetaZoneMapWithEquivalentZones.bind({
                globalSpace: globalSpace
            })
        });
    }
}
//# sourceMappingURL=data-loader.js.map
