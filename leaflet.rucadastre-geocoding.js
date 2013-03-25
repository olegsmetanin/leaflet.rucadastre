/*! Copyright (c) 2013 Oleg Smith (http://olegsmith.com)
 *  Licensed under the MIT License.
 *
 *  L.RuCadastreGeocoding uses jQuery for JSONP requests (http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js)
 */

/*
 * L.RuCadastreGeocoding
 */

L.RuCadastreGeocoding = L.Control.extend({
    options: {
        provider:'rucadastre'
        , i18n : {
            cadnum : '<b>Cadastral number</b>: '
            , objectaddress : 'Object address</b>: '
            , area : '<b>Area (sq. m)</b>: '
            , cost : '<b>Cadastral value (rub.)</b>: '
            , name : '<b>Name</b>: '
        }
    }

    , initialize: function (options) {
        this.options.providers= {
            'rucadastre' : this._rucadastre
        }
        this.setOptions(options);
    }

    , onAdd: function (map) {
        this._map = map;
        return L.DomUtil.create('div', 'leaflet-geocoding');;
    }

    , onRemove: function (map) {
    }

    , setOptions:function (options) {
        var that=this;
        L.setOptions(that, options);
        return that;
    }

    , geocode:function(query) {
        var that=this
            , provider=this.options.provider
            , geoFn = this.options.providers[provider]
            , geoFnProxy=$.proxy(geoFn, that);

            geoFnProxy({
                query : query
                , bounds : that._map.getBounds()
                , zoom : that._map.getZoom()
                , cb : $.proxy(that._zoomto, that)
            });
    }

    , _zoomto: function(georesult) {
        var map = this._map
            , popup=new L.Popup();

        map.fitBounds(georesult.bounds);
        //L.rectangle(georesult.bounds, {color: "#ff7800", weight: 1}).addTo(map);
        popup.setLatLng(georesult.latlng).setContent(georesult.content).addTo(map);
        map.openPopup(popup);
    }

    , _rucadastre:function(arg) {
        var that=this
        , cadnum = arg.query
        , cadparts = cadnum.split(':')
        , cadjoin = cadparts.join('')
        , cb = arg.cb
        , bounds = arg.bounds
        , unproject = function (x, y) {
            var earthRadius = 6378137;
            return L.CRS.EPSG900913.projection.unproject((new L.Point(x, y)).divideBy(earthRadius));
        }
        , i18n = that.options.i18n
        , ajaxopt
        , ajaxtype
        , zoom;

        if (cadparts.length==4) {
            ajaxtype='find';
            ajaxopt = {
                url : 'http://maps.rosreestr.ru/ArcGIS/rest/services/CadastreNew/Cadastre/MapServer/exts/GKNServiceExtension/online/parcel/find'
                , dataType : 'jsonp'
                , data : {
                    'f' : 'json'
                    , 'cadNum' : cadnum
                    , 'onlyAttributes' : 'false'
                    , 'returnGeometry' : 'true'
                }
            }
        } else {
            var ajaxtype='query';

            if (cadjoin.length < 3) {
                zoom = 1;
            } else if (cadjoin.length < 5) {
                zoom = 7;
            } else {
                zoom = 12;
            }

            ajaxopt = {
                url : 'http://maps.rosreestr.ru/ArcGIS/rest/services/CadastreNew/Cadastre/MapServer/'+zoom+'/query'
                , dataType : 'jsonp'
                , data : {
                    'f' : 'json'
                    , 'where' : 'PKK_ID like \''+cadjoin+'%\''
                    , 'returnGeometry' : 'true'
                    , 'spatialRel' : 'esriSpatialRelIntersects'
                    , 'outFields' : '*'
                }
            }
        }


        $.ajax(ajaxopt)
        .done(function(data){
            if (data.features.length>0) {
                var res=data.features[0].attributes
                    , content;

                if (ajaxtype=='find') {
                    content = ''
                        + i18n.cadnum + res['CAD_NUM'] + '<br/>'
                        + i18n.objectaddress + res['OBJECT_ADDRESS'] + '<br/>'
                        + i18n.area + res['AREA_VALUE'] + '<br/>'
                        + i18n.cost + res['CAD_COST'] + '<br/>'
                } else {
                    content = ''
                        + i18n.cadnum + res['CAD_NUM'] + '<br/>'
                        + (zoom < 12 ? i18n.name + res['NAME'] + '<br/>' : '')
                }

                cb({
                    query : arg.query
                    , content : content
                    , latlng : unproject(res['XC'],res['YC'])
                    , bounds : new L.LatLngBounds(unproject(res['XMIN'],res['YMIN']), unproject(res['XMAX'],res['YMAX']))
                });
            }
        });
    }

});