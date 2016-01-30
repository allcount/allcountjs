import React from 'react';
import classNames from 'classnames';
import {Table, Button, Glyphicon, ButtonGroup, DropdownButton, MenuItem} from 'react-bootstrap';

module.exports = (createReactClass) => createReactClass({
    render: function () {
        return <span>
            {this.props.itemsLoader.state().count > 0 ? this.pagesList() : null}
            <ButtonGroup>
                <Button disabled={!this.props.itemsLoader.hasPrevPage()} onClick={this.props.itemsLoader.prevPage.bind(this.props.itemsLoader)}><i className="glyphicon glyphicon-chevron-left"></i></Button>
                <Button disabled={!this.props.itemsLoader.hasNextPage()} onClick={this.props.itemsLoader.nextPage.bind(this.props.itemsLoader)}><i className="glyphicon glyphicon-chevron-right"></i></Button>
            </ButtonGroup>
        </span>
    },
    pagesList: function () {
        //TODO margin
        return <DropdownButton title={`${this.paging().start + 1} - ${this.paging().start + this.paging().count} / ${this.props.itemsLoader.state().count}`} style={{marginRight: 5}}>
                {this.pages().map(this.page)}
        </DropdownButton>
    },
    page: function (page) {
        return <MenuItem onClick={() => this.props.itemsLoader.updatePaging(page)}>{page.start + 1} - {page.start + page.count}</MenuItem>
    },
    pages: function () {
        return this.props.itemsLoader.pages();
    },
    paging: function () {
        return this.props.itemsLoader.state().paging;
    }
});