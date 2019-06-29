 // ==UserScript==
// @name        Battle orders for erepublik
// @include      /^https:\/\/www\.erepublik\.com\/[a-z]{2}$/
// @include     *www.erepublik.com/*/military/battlefield/*
// @include     *www.erepublik.com/*/military/campaigns*
// @connect     zoya.cybcom.net
// @connect     docs.google.com
// @version     0.1
// @grant       GM_xmlhttpRequest
// @grant       unsafeWindow
// @description Erepublik battle orders for erepublik players
// @namespace   https://greasyfork.org/users/2402
// ==/UserScript==

var serverUrl = "https://erep4efrance.000webhostapp.com"; // don't forget to change @connect above

function toHHMMSS (num) {
    var sec_num = parseInt(num, 10);
    var hours = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
//    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours < 10) {hours = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
//    if (seconds < 10) {seconds = "0"+seconds;}
    return hours+':'+minutes; //+':'+seconds;
}

var $ = jQuery;

function style(t) {
    $("head").append("<style>" + t + "</style>");
}

$.expr[':'].textEquals = $.expr.createPseudo(function(arg) {
    return function( elem ) {
        return $(elem).text().match("^" + arg + "$");
    };
});

function roundsInfo() {
    $.ajax({
        url: "/en/military/campaigns-new/",
    })
        .done(function(b) {
            var r = $.parseJSON(b);
            $.each(r.battles, function(i, c) {
                $("span:textEquals('" + c.region.name + "')").text("(" + c.zone_id + ") " + c.region.name);
            });
        });
}

function main() {
    var citizen = unsafeWindow.erepublik.citizen;
    var url = serverUrl + "/orders.php";
    var lang = unsafeWindow.culture;
    var citizenId = citizen.citizenId;
    var level = citizen.userLevel;
    style("#bbo{padding: 10px 0;}");
    style("#bbo ul {list-style-type: none}");
    style("#bbo ul li img{vertical-align: middle;}");
    style(".redH {font-weight: 700}");
    style(".imp0, .imp1, .imp2, .imp3 {clear: both; display: block; float: right; font-weight: 700; color: white; font-size: 110%;}");
    style(".imp1 {background-color: green;}");
    style(".imp2 {background-color: red;}");
    style(".imp3 {background-color: black;}");
    $("#bbo").append("<ul></ul>");
    GM_xmlhttpRequest({
        method: "GET",
        url: url,
        onload: function(response) {
            $.ajax({
                url: "/" + lang + "/military/campaigns-new/",
            })
                .done(function(b) {
                    $.ajax({
                        url: "/" + lang + "/main/citizen-profile-json/" + citizenId,
                    })
                        .done(function(p) {
                            var aRank = p.military.militaryData.aircraft.rankNumber;
                            var energyPerInterval = citizen.energyPerInterval;
                            var energyToRecover = citizen.energyToRecover * 2;
                            var hits = parseInt((citizen.energy + citizen.energyFromFoodRemaining) / 10);
                            var aDamage = parseInt(10 * (1 + 0 / 400) * (1 + aRank / 5) * (1 + 0 / 100) * (level > 100 ? 1.1 : 1));
                            var totalDamage = aDamage * hits;
                            var maxFFDamage = aDamage * energyToRecover / 10;
                            var fullIn = (energyToRecover - (citizen.energy + citizen.energyFromFoodRemaining)) / (energyPerInterval / 6) * 60;
                            var c70kIn = maxFFDamage >= 70000 && totalDamage < 70000 ? "70k: <b>" + toHHMMSS((70000 - totalDamage) / aDamage * 10 / (energyPerInterval / 6) * 60) + " ч</b>; " : '';
                            var c80kIn = maxFFDamage >= 80000 && totalDamage < 80000 ? "80k: <b>" + toHHMMSS((80000 - totalDamage) / aDamage * 10 / (energyPerInterval / 6) * 60) + " ч</b>; " : '';
                            $("#bbo ul").append("<li>Hits: <b>" + hits + "</b>; Damage: <b>" + totalDamage + "</b>; Max damage: <b>" + maxFFDamage + "</b>");
                            $("#bbo ul").append("<li>" + c70kIn + c80kIn + "Full: <b>" + toHHMMSS(fullIn) + " ч.</b>");
                            var r = $.parseJSON(b),
                                orders = $.parseJSON(response.responseText);
                            $.each(orders, function(id, row) {
                                var href = row.link.match(/[0-9]+$/);
                                var side = row.countryid;
                                if (typeof r.battles[href] != 'undefined') {
                                    var round = r.battles[href].zone_id,
                                        reqTime = r.request_time,
                                        roundTime = reqTime - r.battles[href].start,
                                        date = new Date(null);
                                    date.setSeconds(roundTime);
                                    var bTime = date.toISOString().substr(12, 4);
                                } else {
                                    round = 'x';
                                    bTime = '';
                                }
                                var country = row.country;
                                var importance = row.importance;
                                var priority = row.priority;
                                var iCountry = country.replace(/\s/g, '-').replace(/[()]/g, '');
                                var cFlag = country != null ? '<img src="https://www.erepublik.net/images/flags_png/S/' + iCountry + '.png" alt="' + country + '" title="' + country + '">' : '';
                                var caption = "(" + round + ") <span class='redH'>" + bTime + '</span> For ' + cFlag + " in " + row.caption.replace(/(<([^>]+)>)/ig, "");
                                href = href != null ? 'https://www.erepublik.com/' + lang + '/military/battlefield' + (priority < 3 ? '-choose-side' : '') + '/' + href + (priority < 3 ? "/" + side : '') : 'javascript:void(0);';
                                $("#bbo ul").append("<li><a href='" + href + "'>" + caption + "</a><span class='imp" + importance + "'>" + "☆".repeat(importance));
                            });
                        });
                });

        }
    });
}

function damage() {
    var url = serverUrl + "/orders.php",
        sd = unsafeWindow.SERVER_DATA,
        battleId = parseInt(sd.battleId),
        bIds = [];

    GM_xmlhttpRequest({
        method: "GET",
        url: url,
        onload: function(response) {
            var battle = location.href.match(/[0-9]+$/),
                side = $('.country_name').first().text().trim(),
                user = $('.player_name').attr('href').match(/[0-9]+$/),
                zId = sd.zoneId,
                lbId = sd.leftBattleId,
                muId = sd.militaryUnitId,
                kills = 0,
                hits = 0,
                nick = $('.profileDetails a').first().text().trim(),
                url = '/en/military/nbp-stats/' + battleId + '/11',
                orders = $.parseJSON(response.responseText),
                bckgColor = "255,0,0",
                prio = "No",
                importance = 0;
            $.each(orders, function(id, row) {
                var bId = parseInt(row.link.match(/[0-9]+$/));
                if (!isNaN(bId) && bId == battleId && side == row.country) {
                    bckgColor = "0,128,0";
                    prio = "Yes";
                    importance = row.importance;
                }
            });

            style('#send{cursor:pointer;color:#ffe49b;text-decoration:underline;padding:5px;z-index:55555;background-color:rgba(' + bckgColor + ',0.5);right:15px;top:-10px;position:absolute;border: 1px solid #000;border-radius:10px;}');
            $('#total_damage').before('<span id="send" title="Send report">report</span>');
            $('#send').on('click', function() {
                if (confirm("Do you want to send the report?")) {
                    $.getJSON(url)
                        .done(function(data) {
                            var kills = data.stats.personal[zId][lbId].top_damage[0].kills
                            var hits = data.stats.personal[zId][lbId].top_damage[0].hits;
                            var dmg = data.stats.personal[zId][lbId].top_damage[0].damage;
                            var formData = new FormData();
                            var url = '';
                            if (unsafeWindow.SERVER_DATA.onAirforceBattlefield) {
                                url = "google form url"; // airforce data
                                formData.append('entry.', user);
                                formData.append('entry.', nick);
                                formData.append('entry.', battle);
                                formData.append('entry.', dmg);
                                formData.append('entry.', kills);
                                formData.append('entry.', zId);
                                formData.append('entry.', side);
                                formData.append('entry.', prio);
                                formData.append('entry.', importance);
                                formData.append('entry.', hits);
                                formData.append('entry.', muId);
                            } else { // ground data
                                url = "google form url";
                                formData.append('entry.', user);
                                formData.append('entry.', nick);
                                formData.append('entry.', battle);
                                formData.append('entry.', dmg);
                                formData.append('entry.', kills);
                                formData.append('entry.', zId);
                                formData.append('entry.', side);
                                formData.append('entry.', prio);
                                formData.append('entry.', importance);
                                formData.append('entry.', hits);
                                formData.append('entry.', muId);
                            }
                            GM_xmlhttpRequest({
                                method: "POST",
                                url: url,
                                data: formData,
                                onload: function() {
                                    alert("Report sent successful");
                                },
                                onerror: function() {
                                    alert("Problem!");
                                }
                            });
                        });
                }
            });
        }
    });
}

$('#hpTopNews').before("<div id='bbo'></div>");
(/^https:\/\/www\.erepublik\.com\/[a-z]{2}$/) && main();
/military\/battlefield/.test(location.href) && damage();
/military\/campaigns/.test(location.href) && roundsInfo();
