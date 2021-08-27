import {removeHashStartingWith, removeHashStartingWithAnyOf, removeParamsFromUrl} from "../src/lib/helpers";


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

test('removeParamsFromUrl() should not remove hash', async () => {
    expect(removeParamsFromUrl('/some/path#somehash#p1=value&p2&p3=value', ['p1']))
        .toBe('/some/path#somehash&p2&p3=value');

    expect(removeParamsFromUrl('/some/path#somehash#p1=value&p2&p3=value', ['p1', 'p2', 'p3']))
        .toBe('/some/path#somehash');

    expect(removeParamsFromUrl('/some/path#somehash#p1=value&p2&p3=value', ['p2', 'p3']))
        .toBe('/some/path#somehash#p1=value');
});


test('removeHashStartingWith() should remove hash if it starts with the specified chars', async () => {
    expect(removeHashStartingWith('/some/path#somehash#p1=value&p2&p3=value', 'p1'))
        .toBe('/some/path#somehash');

    expect(removeHashStartingWith('/some/path#somehash#p1=value&p2&p3=value', 'P1'))
        .toBe('/some/path#somehash');

    expect(removeHashStartingWith('/some/path#somehash#p1=value&p2&p3=value', 'p'))
        .toBe('/some/path#somehash');

    expect(removeHashStartingWith('/some/path#somehash#P1=value&p2&p3=value', 'p'))
        .toBe('/some/path#somehash');

    expect(removeHashStartingWith('/some/path#somehash#p1=value&p2&p3=value', 's'))
        .toBe('/some/path');
});

test('removeHashStartingWith() should not remove hash if it does not start with the specified chars', async () => {
    expect(removeHashStartingWith('/some/path#somehash#p1=value&p2&p3=value', 'p2'))
        .toBe('/some/path#somehash#p1=value&p2&p3=value');

    expect(removeHashStartingWith('/some/path#somehash#p1=value&p2&p3=value', '#'))
        .toBe('/some/path#somehash#p1=value&p2&p3=value');

    expect(removeHashStartingWith('/some/path#somehash#p1=value&p2&p3=value', ''))
        .toBe('/some/path#somehash#p1=value&p2&p3=value');
});


test('removeHashStartingWithAnyOf() should remove hash if it does start with the specified chars', async () => {
    expect(removeHashStartingWithAnyOf('/some/path#somehash#p1=value&p2&p3=value', ['p2', 'p3', 'p1']))
        .toBe('/some/path#somehash');

    expect(removeHashStartingWithAnyOf('/some/path#somehash#p1=value&p2&p3=value', ['p2', 'p3', 'p1', 's']))
        .toBe('/some/path');

    expect(removeHashStartingWithAnyOf('/some/path#somehash#p1=value&p2&p3=value', ['p', '#', 'p1', 's']))
        .toBe('/some/path');
});

test('removeHashStartingWithAnyOf() should not remove hash if it does not start with the specified chars', async () => {
    expect(removeHashStartingWithAnyOf('/some/path#somehash#p1=value&p2&p3=value', ['p2', 'p3']))
        .toBe('/some/path#somehash#p1=value&p2&p3=value');
});