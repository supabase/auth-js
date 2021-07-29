import {removeParamsFromUrl} from "../src/lib/helpers";


test('testRemoveParamsFromUrl()', async () => {
    expect(removeParamsFromUrl('/some/path#p1=value&p2=value', ['p1', 'p2']))
        .toBe('/some/path');

    expect(removeParamsFromUrl('/some/path#p1=value&p2=value', ['p1']))
        .toBe('/some/path&p2=value');

    expect(removeParamsFromUrl('/some/path?p1=value#p2=value', ['p1', 'p2']))
        .toBe('/some/path');

    expect(removeParamsFromUrl('/some/path?p1=value&p2&p3=value', ['p1', 'p2']))
        .toBe('/some/path&p3=value');

    // 'some' is not a param, it should not be removed.
    expect(removeParamsFromUrl('/some/path?p1=value&p2&p3=value', ['some']))
        .toBe('/some/path?p1=value&p2&p3=value');

    // 'path' is not a param, it should not be removed.
    expect(removeParamsFromUrl('/some/path?p1=value&p2&p3=value', ['path']))
        .toBe('/some/path?p1=value&p2&p3=value');
});