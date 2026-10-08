sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/core/UIComponent"
],
    function (Controller, JSONModel, MessageBox, UIComponent) {
        "use strict";

        return Controller.extend("com.oneemcure.zpogrn.controller.Detail", {
            onInit: function () {

                var oRouter = UIComponent.getRouterFor(this);

                // Attach route pattern matched event
                oRouter.getRoute("RouteDetail").attachPatternMatched(
                    this._onObjectMatched,
                    this

                );

                // View Model
                var oViewModel = new JSONModel({
                    postPOEnabled: true

                });

                this.getView().setModel(oViewModel, "viewModel");

            },

            onCreatePO: function () {

                // var oCheckBox = this.byId("headerSelectCheckBox");
                // if (!oCheckBox.getSelected()) {
                //     MessageBox.error("Please select atleast single item");
                //     return;
                // }
                // var oRouteModel = this.getView().getModel("RouteSelection");
                // if (!oRouteModel) {
                //     MessageBox.error("No data selected for posting.");
                //     return;
                // }

                // var oData = oRouteModel.getData();


                var oList = this.byId("headerList");

                var aItems = oList.getItems();

                var oSelectedHeader = null;

                aItems.forEach(function (oListItem) {

                    var oCheckBox = oListItem
                        .getContent()[0]
                        .getItems()[0]
                        .getItems()[0];

                    if (oCheckBox.getSelected()) {
                        oSelectedHeader =
                            oCheckBox.getBindingContext("RouteSelection").getObject();
                    }

                });

                if (oSelectedHeader.PurchaseOrder) {
                    MessageBox.error("Purchase Order already created!");
                    return;
                }
                if (!oSelectedHeader) {
                    MessageBox.error("Please select at least one invoice!");
                    return;
                }

                // Fill Header details
                var oPayload = {
                    InvoiceNo: oSelectedHeader.InvoiceNo,
                    CompCode: oSelectedHeader.CompCode,
                    CommercInv: oSelectedHeader.CommercInv,
                    BillTo: oSelectedHeader.BillTo,
                    BillToName: oSelectedHeader.BillToName,
                    ShipTo: oSelectedHeader.ShipTo,
                    ShipToName: oSelectedHeader.ShipToName,
                    Curr: oSelectedHeader.Curr,
                    PaymentTerms: oSelectedHeader.PaymentTerms,
                    Incoterms: oSelectedHeader.Incoterms,
                    IncotermsLoc1: oSelectedHeader.IncotermsLoc1,
                    ToItem: [],
                    ReturnMessageSet: []

                };

                // var aItems = oRouteModel.getProperty("/Item");
                var aItems = oSelectedHeader.ToItem.results;
                // getProperty("/ToItem");

                // Fill Item details

                // oRouteModel.oData.Header.ToItem.forEach(function (oItem) {
                aItems.forEach(function (oItem) {
                    oPayload.ToItem.push({
                        InvoiceNo: oItem.InvoiceNo,
                        Item: oItem.Item,
                        Material: oItem.Material,
                        Quantity: oItem.Quantity,
                        Plant: oItem.Plant,
                        Unit: oItem.Unit,
                        NetValue: oItem.NetValue,

                    });

                });

                var oODataModel = this.getOwnerComponent().getModel();

                sap.ui.core.BusyIndicator.show(0);

                oODataModel.create("/BillingHeaderSet", oPayload, {

                    success: function (oResponse) {

                        sap.ui.core.BusyIndicator.hide();
                        // Get RouteSelection JSON model
                        var oRouteModel =
                            this.getView().getModel("RouteSelection");

                        if (oResponse.PurchaseOrder) {

                            oRouteModel.setProperty(
                                sSelectedHeaderPath + "/PurchaseOrder",
                                oResponse.PurchaseOrder
                            );

                            // 28.09.2026 START...
                            var oSelectionData = oSelectionModel.getData();

                            //Get Odata Model
                            var oODatamodel = this.getOwnerComponent().getModel();

                            var aFilters = [];

                            if (oSelectionModel.oData.oData.INVFrom) {

                                aFilters.push(
                                    new sap.ui.model.Filter("InvoiceNo", sap.ui.model.FilterOperator.EQ,
                                        oSelectionModel.oData.oData.INVFrom
                                    )
                                );

                            }

                            var oView = this.getView();
                            oView.setBusy(true);

                            oODatamodel.read("/BillingHeaderSet", {

                                filters: aFilters,

                                urlParameters: {

                                    // "$expand": "BillingItemSet"
                                    "$expand": "ToItem"

                                },

                                success: function (oData) {
                                    oView.setBusy(false);

                                    if (!oData.results || oData.results.length === 0) {

                                        sap.m.MessageToast.show("No data found");

                                        return;

                                    }

                                    var oJsonData = {
                                        Header: oData.results,
                                        Item: oData.results[0].ToItem.results
                                    };

                                    var oRouteModel = new sap.ui.model.json.JSONModel(oJsonData);

                                    this.getView().setModel(
                                        oRouteModel,
                                        "RouteSelection"
                                    );

                                }.bind(this),


                                error: function () {
                                    oView.setBusy(false);
                                    sap.m.MessageToast.show("Error fetching data!");

                                }
                            })
                            // 28.09.2026 END...
                        }

                        var sMessages = "";
                        var sIcon = sap.m.MessageBox.Icon.SUCCESS;
                        var sTitle = "Success";

                        if (oResponse.ReturnMessageSet &&
                            oResponse.ReturnMessageSet.results &&
                            oResponse.ReturnMessageSet.results.length > 0) {

                            oResponse.ReturnMessageSet.results.forEach(function (oMsg) {

                                sMessages +=
                                    "* " + oMsg.Message + "\n";

                                if (oMsg.Type === "E") {
                                    sIcon = sap.m.MessageBox.Icon.ERROR;
                                    sTitle = "Error";

                                } else if (oMsg.Type === "W" &&
                                    sIcon !== sap.m.MessageBox.Icon.ERROR) {
                                    sIcon = sap.m.MessageBox.Icon.WARNING;
                                    sTitle = "Warning";

                                } else if (oMsg.Type === "S" &&
                                    sIcon !== sap.m.MessageBox.Icon.SUCCESS) {
                                    sIcon = sap.m.MessageBox.Icon.SUCCESS;
                                    sTitle = "Success";

                                }


                            });

                        }
                        //  else {

                        //     sMessages = "PO created successfully";

                        // }

                        sap.m.MessageBox.show(
                            sMessages,
                            {
                                icon: sIcon,
                                title: sTitle,
                                actions: [sap.m.MessageBox.Action.OK]

                            });
                    }.bind(this),

                    error: function (oError) {

                        sap.ui.core.BusyIndicator.hide();

                        var sErrorMessage = "Unexpected error occurred";

                        try {

                            var oErrorResponse =
                                JSON.parse(oError.responseText);

                            sErrorMessage = oErrorResponse.error.message.value;

                        } catch (e) {

                            // Ignore

                        }

                        sap.m.MessageBox.error(sErrorMessage);

                    }

                });

            },

            //Create GRN
            onCreateGRN: function () {

                //************ */
                var oList = this.byId("headerList");

                var aItems = oList.getItems();

                var oSelectedHeader = null;

                aItems.forEach(function (oListItem) {

                    var oCheckBox = oListItem
                        .getContent()[0]
                        .getItems()[0]
                        .getItems()[0];

                    if (oCheckBox.getSelected()) {
                        oSelectedHeader =
                            oCheckBox.getBindingContext("RouteSelection").getObject();
                    }

                });

                if (oSelectedHeader.MaterialDoc) {
                    MessageBox.error("GRN document already exists!");
                    return;
                }
                if (!oSelectedHeader) {
                    MessageBox.error("Please select at least one invoice!");
                    return;
                }
                if (!oSelectedHeader.PurchaseOrder) {
                    MessageBox.error("Please Create Purchase Order first!");
                    return;
                }

                // Fill Header details
                var oPayload = {
                    InvoiceNo: oSelectedHeader.InvoiceNo,
                    CompCode: oSelectedHeader.CompCode,
                    CommercInv: oSelectedHeader.CommercInv,
                    BillTo: oSelectedHeader.BillTo,
                    BillToName: oSelectedHeader.BillToName,
                    ShipTo: oSelectedHeader.ShipTo,
                    ShipToName: oSelectedHeader.ShipToName,
                    Curr: oSelectedHeader.Curr,
                    PaymentTerms: oSelectedHeader.PaymentTerms,
                    Incoterms: oSelectedHeader.Incoterms,
                    IncotermsLoc1: oSelectedHeader.IncotermsLoc1,
                    PurchaseOrder: oSelectedHeader.PurchaseOrder,
                    ToItem: [],
                    ReturnMessageSet: []

                };

                // var aItems = oRouteModel.getProperty("/Item");
                var aItems = oSelectedHeader.ToItem.results;
                // getProperty("/ToItem");

                // Fill Item details

                // oRouteModel.oData.Header.ToItem.forEach(function (oItem) {
                aItems.forEach(function (oItem) {
                    oPayload.ToItem.push({
                        InvoiceNo: oItem.InvoiceNo,
                        Item: oItem.Item,
                        Material: oItem.Material,
                        Quantity: oItem.Quantity,
                        Plant: oItem.Plant,
                        Unit: oItem.Unit,
                        NetValue: oItem.NetValue,

                    });

                });

                var oODataModel = this.getOwnerComponent().getModel();

                sap.ui.core.BusyIndicator.show(0);

                oODataModel.create("/BillingHeaderSet", oPayload, {

                    success: function (oResponse) {

                        sap.ui.core.BusyIndicator.hide();
                        // Get RouteSelection JSON model
                        var oRouteModel =
                            this.getView().getModel("RouteSelection");

                        if (oResponse.MaterialDoc) {

                            oRouteModel.setProperty(
                                sSelectedHeaderPath + "/MaterialDoc",
                                oResponse.MaterialDoc
                            );

                        }

                        var sMessages = "";
                        var sIcon = sap.m.MessageBox.Icon.SUCCESS;
                        var sTitle = "Success";

                        if (oResponse.ReturnMessageSet &&
                            oResponse.ReturnMessageSet.results &&
                            oResponse.ReturnMessageSet.results.length > 0) {

                            oResponse.ReturnMessageSet.results.forEach(function (oMsg) {

                                sMessages +=
                                    oMsg.Message + "\n";

                                if (oMsg.Type === "E") {
                                    sIcon = sap.m.MessageBox.Icon.ERROR;
                                    sTitle = "Error";

                                } else if (oMsg.Type === "W" &&
                                    sIcon !== sap.m.MessageBox.Icon.ERROR) {
                                    sIcon = sap.m.MessageBox.Icon.WARNING;
                                    sTitle = "Warning";

                                } else if (oMsg.Type === "S" &&
                                    sIcon !== sap.m.MessageBox.Icon.SUCCESS) {
                                    sIcon = sap.m.MessageBox.Icon.SUCCESS;
                                    sTitle = "Success";

                                }


                            });

                        }
                        //  else {

                        //     sMessages = "PO created successfully";

                        // }

                        sap.m.MessageBox.show(
                            sMessages,
                            {
                                icon: sIcon,
                                title: sTitle,
                                actions: [sap.m.MessageBox.Action.OK]

                            });
                    }.bind(this),

                    error: function (oError) {

                        sap.ui.core.BusyIndicator.hide();

                        var sErrorMessage = "Unexpected error occurred";

                        try {

                            var oErrorResponse =
                                JSON.parse(oError.responseText);

                            sErrorMessage = oErrorResponse.error.message.value;

                        } catch (e) {

                            // Ignore

                        }

                        sap.m.MessageBox.error(sErrorMessage);

                    }

                });

            },

            _onObjectMatched: function () {

                /*
                * resultModel was created in View1 controller.
                *
                * Example:
                *
                * this.getOwnerComponent().setModel(
                *     oResultModel,
                *     "resultModel"
                * );
                *
                * Therefore Detail view can access it.
                */

                // var oSelectionData = this.getView()
                //                          .getModel("selection");
                var oSelectionModel = this.getOwnerComponent()
                    .getModel("selectionData");

                if (!oSelectionModel) {
                    return;
                }

                var oSelectionData = oSelectionModel.getData();

                //Get Odata Model
                var oODatamodel = this.getOwnerComponent().getModel();

                var aFilters = [];
                // Commercial Invoice

                if (oSelectionModel.oData.oData.BillingDocument) {
                    aFilters.push(
                        new sap.ui.model.Filter("CommercInv", sap.ui.model.FilterOperator.EQ,
                            oSelectionModel.oData.oData.BillingDocument),

                            new sap.ui.model.Filter("Year", sap.ui.model.FilterOperator.EQ,
                                oSelectionModel.oData.oData.Year)
                    );

                }
                // Invoice Number Range

                if (oSelectionModel.oData.oData.INVFrom && oSelectionModel.oData.oData.INVTo) {

                    aFilters.push(
                        new sap.ui.model.Filter("InvoiceNo", sap.ui.model.FilterOperator.BT,
                            oSelectionModel.oData.oData.INVFrom, oSelectionModel.oData.oData.INVTo),

                        new sap.ui.model.Filter("Year", sap.ui.model.FilterOperator.EQ,
                            oSelectionModel.oData.oData.Year)
                    );

                } else if (oSelectionModel.oData.oData.INVFrom) {
                    aFilters.push(new sap.ui.model.Filter("InvoiceNo", sap.ui.model.FilterOperator.EQ,
                        oSelectionModel.oData.oData.INVFrom),

                        new sap.ui.model.Filter("Year", sap.ui.model.FilterOperator.EQ,
                            oSelectionModel.oData.oData.Year)

                    );
                }

                var oView = this.getView();
                oView.setBusy(true);

                oODatamodel.read("/BillingHeaderSet", {
                    filters: aFilters,

                    urlParameters: {

                        // "$expand": "BillingItemSet"
                        "$expand": "ToItem"

                    },

                    success: function (oData) {
                        oView.setBusy(false);

                        if (!oData.results || oData.results.length === 0) {

                            sap.m.MessageToast.show("No data found");

                            return;

                            this.onNavBack();

                        }

                        var oJsonData = {
                            Header: oData.results,
                            Item: oData.results[0].ToItem.results
                        };

                        var oRouteModel = new sap.ui.model.json.JSONModel(oJsonData);

                        this.getView().setModel(
                            oRouteModel,
                            "RouteSelection"
                        );

                    }.bind(this),

                    error: function () {
                        oView.setBusy(false);
                        sap.m.MessageToast.show("Error fetching data");

                    }
                })

            },

            onNavBack: function () {

                var oRouter = UIComponent.getRouterFor(this);
                // if (oRouter.oRouteModel) {
                //     oRouter.oRouteModel.setProperty("/Header", []);
                //     oRouter.oRouteModel.setProperty("/Item", [] );
                //     }
                
                oRouter.navTo("RouteMaster");

            }
        }

        )

    });

