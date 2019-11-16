'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

function getGenericZoneName(offset, isShort, locale) {
    var offsetSign = offset < 0 ? '-' : '+',
        hourVal = Math.floor(Math.abs(offset / 60)),
        minuteVal = Math.abs(offset % 60);

    var hour = Intl.NumberFormat(locale, {
        minimumIntegerDigits: isShort ? 1 : 2
    }).format(hourVal);

    var minute = Intl.NumberFormat(locale, {
        minimumIntegerDigits: 2
    }).format(minuteVal);

    if (offset === 0) {
        return '';
    }

    if (isShort && minuteVal === 0) {
        minute = '';
    }

    return offsetSign + hour + (minute ? ':' : '') + minute;
}

function getRelevantMetaZone(metaNameData, timeStamp, offsetString) {
    if (!Array.isArray(metaNameData)) {
        return null;
    }

    if (metaNameData.length === 1) {
        return metaNameData[0].mzone;
    }

    var minTs = Math.pow(2, 31) * -1000;
    var maxTs = Math.pow(2, 31) * 1000;

    var mzone = null;

    metaNameData.forEach(function (metaName) {
        var fromVal = metaName.from ? new Date(metaName.from + offsetString).getTime() : minTs;
        var toVal = metaName.to ? new Date(metaName.to + offsetString).getTime() : maxTs;

        if (fromVal <= timeStamp && timeStamp <= toVal) {
            mzone = metaName.mzone;
        }
    });

    return mzone;
}

function pickZoneName(isShort, isdst, cldrZoneNames) {
    if (!isShort && cldrZoneNames.long) {
        if (isdst && cldrZoneNames.long.daylight) {
            return cldrZoneNames.long.daylight;
        } else if (!isdst && cldrZoneNames.long.standard) {
            return cldrZoneNames.long.standard;
        }
    } else if (cldrZoneNames.short) {
        if (isdst && cldrZoneNames.short.daylight) {
            return cldrZoneNames.short.daylight;
        } else if (!isdst && cldrZoneNames.short.standard) {
            return cldrZoneNames.short.standard;
        }
    }

    return false;
}

function getTimeZoneOffsetInfo(timeZoneHistory, date) {
    var ts = date.getTime();
    var offsetHist = timeZoneHistory.reduce(function (find, hist) {
        return hist.until >= ts && find === null ? hist : find;
    }, null);

    return offsetHist ? offsetHist : timeZoneHistory[timeZoneHistory.length - 1];
}

function getZoneNameForLocale(_ref) {
    var locale = _ref.locale,
        ianaTimeZone = _ref.ianaTimeZone,
        offset = _ref.offset,
        isdst = _ref.isdst,
        isShort = _ref.isShort,
        timeStamp = _ref.timeStamp;

    var metaZoneName = getRelevantMetaZone(Intl._metaZoneData.get(ianaTimeZone), timeStamp, getGenericZoneName(offset));
    var cldrZones = Intl._localeData.getLocale(locale);
    var cldrZoneNamesThruMetaZone = metaZoneName && cldrZones && cldrZones.metazone[metaZoneName];
    var cldrZoneNamesThruIanaTimeZone = cldrZones && cldrZones.zone && cldrZones.zone[ianaTimeZone];

    if (cldrZoneNamesThruIanaTimeZone && pickZoneName(isShort, isdst, cldrZoneNamesThruIanaTimeZone)) {
        return pickZoneName(isShort, isdst, cldrZoneNamesThruIanaTimeZone);
    } else if (cldrZoneNamesThruMetaZone && pickZoneName(isShort, isdst, cldrZoneNamesThruMetaZone)) {
        return pickZoneName(isShort, isdst, cldrZoneNamesThruMetaZone);
    } else if (cldrZones && cldrZones.gmtFormat && offset) {
        cldrZones.gmtFormat.replace('{0}', getGenericZoneName(offset, isShort, locale));
    } else if (cldrZones && cldrZones.gmtZeroFormat && !offset) {
        return cldrZones.gmtZeroFormat;
    }

    return offset && ['GMT', getGenericZoneName(offset, isShort, locale)].join('') || 'GMT';
}

var buildCachedCheckTimeZoneSupport = function buildCachedCheckTimeZoneSupport(globalScope) {
    var hasSupport = {};

    return function (ianaTimeZone) {
        if (hasSupport[ianaTimeZone] !== undefined) {
            return hasSupport[ianaTimeZone];
        }

        try {
            new globalScope.Intl._DateTimeFormat('en', {
                timeZone: ianaTimeZone
            });
            hasSupport[ianaTimeZone] = true;
        } catch (exp) {
            hasSupport[ianaTimeZone] = false;
        }

        return hasSupport[ianaTimeZone];
    };
};

exports.buildCachedCheckTimeZoneSupport = buildCachedCheckTimeZoneSupport;
exports.getTimeZoneOffsetInfo = getTimeZoneOffsetInfo;
exports.getZoneNameForLocale = getZoneNameForLocale;
//# sourceMappingURL=lookup-utill.js.map
