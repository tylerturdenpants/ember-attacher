<template>{{~#if @renderInPlace~}}{{yield}}{{~else~}}{{#in-element @destinationElement insertBefore=null}}{{yield}}{{/in-element}}{{~/if~}}</template>
