;(function ($, un) {
    'use strict';

    function AutoDependencies(context, options) {
        var self = this,
            defaultOptions = {
                source : null,
                minChars : 1,
                triggerEvent : 'blur',
                deferRequestBy : 0,
                lookupPredicate : function (row, term) { // Provides data filtering for local data
                    return row.toLowerCase().indexOf(term.toLowerCase()) !== -1;
                }
            }; 
        
        self.xhrRequest = null;
        self.currentOptions = $.extend({}, defaultOptions, options);
        self.isLocal = $.isArray(self.currentOptions.source) ? true : false;
        self.sourceElement = $(context).bind(self.currentOptions.triggerEvent, function () {
            self.eventHandler(this);
        });
     
        self.dependents = $(document).find('[data-injector="' + self.sourceElement[0].name + '"]')
                                     .prop('readonly', true);
    }

    AutoDependencies.objectIndexRegex = /\[(\d+)\]/;
    AutoDependencies.replaceIndexRegex = /\[.*?\]/;

    AutoDependencies.prototype = {
        eventHandler : function (target) {
            var self = this;
            
            if (self.currentOptions.deferRequestBy) {
                setTimeout(function () { 
                    self.makeRequest(target.value);
                }, self.currentOptions.deferRequestBy);
            } else {
                self.makeRequest(target.value);
            }
        },

        makeRequest : function (value) {
            var self = this, 
                options = self.currentOptions;
          
            if (!options.source) {
                return;
            }
            
            if (value.length < options.minChars) {
                self.clearDependents();
                return;
            }
        
            if (self.isLocal) {
                self.fillDependents(self.getLocalData(value));
                return;
            }

            if (self.xhrRequest) {
                self.xhrRequest.abort();  
            }
            
            self.xhrRequest = $.get(options.source, { parent : value }, function (data) {
                self.fillDependents(data);
            }, 'json');
        },

        parseObject : function (base, propStr) {
            var i = propStr.indexOf('.'), objIndex, prop;

            prop = propStr.substring(0, (i == -1 ? propStr.length : i));
            //Check square brackets - []
            objIndex = prop.match(AutoDependencies.objectIndexRegex);
            if (objIndex) {
                //prop is only a array index, ex.:[0]
                if (objIndex.index == 0) {
                    base = base[objIndex[1]];
                } else { //prop is a mix of property and index
                    base = base[prop.replace(AutoDependencies.replaceIndexRegex, '')][objIndex[1]];
                }
            } else {
                base = base[prop];
            }

            return i == -1 ? base : this.parseObject(base, propStr.substring(++i));
        },

        fillDependents : function (data) {
            if (!data) {
                this.clearDependents();
                return;    
            }
            
            var self = this;
            $.each(self.dependents, function () {
                this.value = self.parseObject(data, $(this).attr('data-property'));
            }); 
        },

        clearDependents : function () {
            this.dependents.val('');
        }, 

        getLocalData : function (term) {
            var predicate = this.currentOptions.lookupPredicate,
                dataSource = this.currentOptions.source, current; 

            for (var i = 0, dataSourceLen = dataSource.length; i < dataSourceLen; ++i) {
                current = dataSource[i];
                if (predicate(current, term)) {
                    return current;
                }
            }

            return null;
         }
    };

    $.fn.autodependencies = function (options) {
        return this.each(function () {
            var that = $(this);

            if (that.data('autodependencies')) {
                that.data('autodependencies');    
            } else {
                var obj = new AutoDependencies(this, options);
                that.data('autodependencies', obj);
            }
        });
    };
})(jQuery, undefined);
