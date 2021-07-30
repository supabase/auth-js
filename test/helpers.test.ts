import {removeParamsFromUrl} from "../src/lib/helpers";


test('removeParamsFromUrl() should remove Gotrue params from hash, ignoring case', async () => {
    expect(removeParamsFromUrl('/some/path#p1=value&p2=value', ['p1', 'p2']))
        .toBe('/some/path');

    expect(removeParamsFromUrl('/some/path#p1=value&p2=value', ['p1']))
        .toBe('/some/path&p2=value');

    expect(removeParamsFromUrl('/some/path?p1=value#p2=value', ['p1', 'p2']))
        .toBe('/some/path');

    expect(removeParamsFromUrl('/some/path?p1=value&p2&p3=value', ['p1', 'p2']))
        .toBe('/some/path&p3=value');

    expect(removeParamsFromUrl('/some/path?P1=value&p2&p3=value', ['p1', 'P3']))
        .toBe('/some/path&p2');
});


test('removeParamsFromUrl() should not remove path information', async () => {
    expect(removeParamsFromUrl('/some/path?p1=value&p2&p3=value', ['some']))
        .toBe('/some/path?p1=value&p2&p3=value');

    expect(removeParamsFromUrl('/some/path?p1=value&p2&p3=value', ['path']))
        .toBe('/some/path?p1=value&p2&p3=value');
});