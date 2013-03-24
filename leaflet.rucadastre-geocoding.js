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

    , geocode:function(address) {
        var provider=this.options.provider
            , geoFn = this.options.providers[provider];

        geoFn(address, function (georesult) {
            this._zoomto(georesult)
        }.bind(this));

    }

    , _zoomto: function(georesult) {
        var map = this._map
            , popup=new L.Popup();

        map.fitBounds(georesult.bounds);
        //L.rectangle(georesult.bounds, {color: "#ff7800", weight: 1}).addTo(map);
        popup.setLatLng(georesult.latlng).setContent(georesult.address).addTo(map);
        map.openPopup(popup);
    }

    , _rucadastre:function(address, cb) {
        var that=this
        , unproject = function (x, y) {
            var earthRadius = 6378137;
            return L.CRS.EPSG900913.projection.unproject((new L.Point(x, y)).divideBy(earthRadius));
        };

        $.ajax({
            url : 'http://maps.rosreestr.ru/ArcGIS/rest/services/CadastreNew/Cadastre/MapServer/7/query'
            , dataType : 'jsonp'
            , data : {
                'f' : 'json'
                , 'where' : 'PKK_ID like \''+address+'%\''
                , 'returnGeometry' : 'true'
                , 'spatialRel' : 'esriSpatialRelIntersects'
                , 'outFields' : '*'
            }
        })
        .done(function(data){
            var res=data.features[0].attributes;
            cb({
                address : res['CAD_NUM'] + ' ' + res['NAME']
                , latlng : unproject(res['XC'],res['YC'])
                , bounds : new L.LatLngBounds(unproject(res['XMIN'],res['YMIN']), unproject(res['XMAX'],res['YMAX']))
            });
        });
    }

});


// bind function (https://developer.mozilla.org/ru/docs/JavaScript/Reference/Global_Objects/Function/bind)
if (!Function.prototype.bind) {
  Function.prototype.bind = function (oThis) {
    if (typeof this !== "function") {
      // closest thing possible to the ECMAScript 5 internal IsCallable function
      throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
    }

    var aArgs = Array.prototype.slice.call(arguments, 1),
        fToBind = this,
        fNOP = function () {},
        fBound = function () {
          return fToBind.apply(this instanceof fNOP && oThis
                                 ? this
                                 : oThis,
                               aArgs.concat(Array.prototype.slice.call(arguments)));
        };

    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();

    return fBound;
  };
}
